/* eslint complexity: ["error", 9] */
/* eslint max-params: ["error", 9] */
/* eslint consistent-return: [0] */
// Polyfill Promise for IE11
import 'core-js/features/promise';

import Highcharts from 'highcharts/highstock';
import Papa from 'papaparse';
import accessibility from 'highcharts/modules/accessibility';
import chartHooks from './chart-hooks.js';
import defaultBar from './bar-styles.js';
import defaultDatetime from './datetime-styles.js';
import defaultLine from './line-styles.js';
import fetch from 'cross-fetch';

accessibility( Highcharts );

const dataCache = {};

/**
 * Fetches data from the global dataCache
 * @param {string} url The url to fetch data from
 * @returns {Promise | undefined} A promise that resolves to JSON data or undefined
 */
function fetchFromCache( url ) {
  const cached = dataCache[url];
  if ( cached ) return Promise.resolve( cached );
}

/**
 * Stores data in the global dataCache
 * @param {string} url The url to use for the key
 * @param {Object} data The JSON data to store
 */
function storeInCache( url, data ) {
  dataCache[url] = data;
}

/**
 * Fetches JSON data
 * @param {string} url The url to fetch data from
 * @param {Boolean} isCSV Whether the data to fetch is a CSV
 * @returns {Promise} Promise that resolves to JSON data
 */
function fetchData( url, isCSV ) {
  const data = fetchFromCache( url );
  if ( data ) return Promise.resolve( data );
  const p = fetch( url ).then( res => {
    let prom;
    if ( isCSV ) prom = res.text();
    else prom = res.json();

    return prom.then( d => {
      if ( isCSV ) d = Papa.parse( d, { header: true } ).data;
      storeInCache( url, d );
      return Promise.resolve( d );
    } );
  } );
  storeInCache( url, p );
  return p;
}

/**
 * Selects appropriate chart import style
 * @param {string} type The chart type as defined in the organism
 * @returns {object} The appropriately loaded style object
 */
function getDefaultChartObject( type ) {
  switch ( type ) {
    case 'bar':
      return defaultBar;
    case 'datetime':
      return defaultDatetime;
    case 'line':
      return defaultLine;
    default:
      throw new Error( 'Unknown chart type specified' );
  }
}

/**
 * Mutates a style object with entries from the style overrides field
 * @param {string} styleOverrides Stringified JSON style overrides
 * @param {object} obj The object to mutate
 * @param {object} data The data to provide to the chart
 */
function applyOverrides( styleOverrides, obj, data ) {
  const styles = JSON.parse( styleOverrides );
  Object.keys( styles ).forEach( key => {
    const override = resolveOverride( styles[key], data );
    key.split( '.' ).reduce( ( acc, curr, i, arr ) => {
      if ( i === arr.length - 1 ) return ( acc[curr] = override );
      if ( !acc[curr] ) acc[curr] = {};
      return acc[curr];
    }, obj );
  } );
}

/**
 * Pulls specified keys from the resolved data object
 * @param {array} rawData Array of data from JSON, CSV or directly entered
 * @param {string} series The keys for data to render into the chart
 * @param {string} x_axis_data Key or array of categories
 * @returns {array} Series data
 */
function extractSeries( rawData, { series, xAxisData, chartType } ) {
  if ( series ) {
    if ( series.match( /^\[/ ) ) {
      series = JSON.parse( series );
    } else {
      series = [ series ];
    }

    if ( chartType === 'datetime' ) {
      if ( !xAxisData ) xAxisData = 'x';
    }

    const seriesData = [];

    // array of {name: str, data: arr (maybe of obj)}
    series.forEach( currSeries => {
      const currArr = [];
      const currObj = { name: currSeries, data: currArr };

      rawData.forEach( obj => {
        let d = Number( obj[currSeries] );
        if ( chartType === 'datetime' ) {
          d = {
            x:  new Date( obj[xAxisData] ),
            y: d
          };
        }
        currArr.push( d );
      } );
      seriesData.push( currObj );
    } );
    return seriesData;
  }
  return null;
}

/**
 * Formats processed series data as expected by Highcharts
 * @param {object} data Series data in various acceptable formats
 * @returns {object} Correctly formatted series object
 */
function formatSeries( data ) {
  const { series } = data;
  if ( series ) {
    if ( !isNaN( series[0] ) ) {
      return [ { data: series } ];
    }
    return series;
  }
  return [ { data: data.transformed || data.raw } ];
}

/**
 * Overrides default chart options using provided Wagtail configurations
 * @param {object} data The data to provide to the chart
 * @param {object} dataProps (destructured) data-* props attached to the chart HTML
 * @returns {object} The configured style object
 */
function makeChartOptions(
  data,
  { chartType, styleOverrides, description, xAxisData, xAxisLabel, yAxisLabel }
) {
  const defaultObj = JSON.parse(
    JSON.stringify( getDefaultChartObject( chartType ) )
  );

  if ( styleOverrides ) {
    applyOverrides( styleOverrides, defaultObj, data );
  }

  if ( xAxisData && chartType !== 'datetime' ) {
    defaultObj.xAxis.categories = resolveKey( data.raw, xAxisData );
  }
  /* eslint-disable-next-line */
  defaultObj.title = { text: undefined };
  defaultObj.series = formatSeries( data );
  defaultObj.accessibility.description = description;
  defaultObj.yAxis.title.text = yAxisLabel;
  if ( xAxisLabel ) defaultObj.xAxis.title.text = xAxisLabel;

  return defaultObj;
}

/**
 * Resolves provided x axis or series data
 * @param {array} rawData Data provided to the chart
 * @param {string} key Key to resolve from data, or categories provided directly
 * @returns {array} Resolved array of data
 */
function resolveKey( rawData, key ) {
  // Array provided directly
  if ( key.match( /^\[/ ) ) {
    return JSON.parse( key );
  }
  return rawData.map( d => d[key] );
}

/**
 * Mechanism for passing functions or applied functions to the chart style object
 * @param {string} override Prefixed refered to a function in chart-hooks.js
 * @param {object} data Data provided to chart
 * @returns {function|string} Result of the override or the provided unmatched style
 */
function resolveOverride( override, data ) {
  if ( typeof override === 'string' ) {
    if ( override.match( /^fn__/ ) ) {
      return chartHooks[override.replace( 'fn__', '' )];
    } else if ( override.match( /^hook__/ ) ) {
      return chartHooks[override.replace( 'hook__', '' )]( data );
    }
  }
  return override;
}

/**
 * Selects whether to use inline data or fetch data that matches a url
 * @param {string} source Source provided from wagtail
 * @returns {Promise} Promise resolving to either fetched JSON or parsed inline JSON
 */
function resolveData( source ) {
  if ( source.match( /^http/i ) || source.match( /^\// ) ) {
    const isCSV = Boolean( source.match( /csv$/i ) );
    return fetchData( source, isCSV );
  }
  return Promise.resolve( JSON.parse( source ) );
}

/**
 * Wires up select filters, if present
 * @param {object} filter Object with a filter key and possible label
 * @param {object} data The raw chart data
 * @returns {array} List of options for the select
 */
function getOptions( filter, data ) {
  const vals = {};
  const { key } = filter;
  data.forEach( d => {
    let item = d[key];
    if ( !Array.isArray( item ) ) item = [ item ];
    item.forEach( v => {
      vals[v] = 1;
    } );
  } );

  return Object.keys( vals );
}

/**
 * @param {array} options List of options to build for the select component
 * @param {object} chartNode The DOM node of the current chart
 * @param {object} filter key and possible label to filter on
 * @returns {object} the built select DOM node
 */
function makeFilterDOM( options, chartNode, filter ) {
  const name = filter.label ? filter.label : filter.key;
  const id = Math.random() + name;
  const attachPoint = chartNode.getElementsByClassName( 'chart-selects' )[0];

  const wrapper = document.createElement( 'div' );
  wrapper.className = 'select-wrapper m-form-field m-form-field__select';

  const label = document.createElement( 'label' );
  label.className = 'a-label a-label__heading';
  label.innerText = 'Select ' + name;
  label.htmlFor = id;

  const selectDiv = document.createElement( 'div' );
  selectDiv.className = 'a-select';

  const select = document.createElement( 'select' );
  select.id = id;
  select.dataset.key = filter.key;

  const allOpt = document.createElement( 'option' );
  allOpt.value = '';
  allOpt.innerText = 'View all';
  select.appendChild( allOpt );

  options.forEach( option => {
    const opt = document.createElement( 'option' );
    opt.value = option;
    opt.innerText = option;
    select.appendChild( opt );
  } );

  selectDiv.appendChild( select );
  wrapper.appendChild( label );
  wrapper.appendChild( selectDiv );
  attachPoint.appendChild( wrapper );

  return select;
}

/**
 * @param {string} title The title to be case adjusted
 * @returns {string} The case adjusted title
 */
function titleCase( title ) {
  if ( title[0].match( /[A-Z]/ ) && !title[1].match( /[A-Z]/ ) ) {
    return title[0].toLowerCase() + title.slice( 1 );
  }
}

/**
 * @param {object} chartNode The DOM node of the current chart
 * @returns {object} the built select DOM node
 */
function makeSelectHeaderDOM( chartNode ) {
  const attachPoint = chartNode.getElementsByClassName( 'chart-selects' )[0];
  const selectHeader = document.createElement( 'h3' );
  selectHeader.innerText = 'Total ' + titleCase( attachPoint.dataset.title );
  attachPoint.appendChild( selectHeader );

  return selectHeader;
}

/**
 * @param {object} selectNode The DOM node of the select component
 * @param {object} chartNode The DOM node of the chart
 * @param {object} chart The Highcharts chart object
 * @param {object} dataset Data passed via data-* tags
 * @param {object} filter The filter key and possible label
 * @param {object} data The raw chart data, untransformed
 * @param {function} transform The transform function for this chart
 */
function attachFilter(
  selectNode, chartNode, chart, dataset, filter, data, transform
) {
  const attachPoint = chartNode.getElementsByClassName( 'chart-selects' )[0];
  const selectHeader = attachPoint.querySelector( 'h3' );
  const { styleOverrides } = dataset;
  const title = titleCase( attachPoint.dataset.title );
  selectNode.addEventListener( 'change', () => {
    // filter on all selects
    const selects = chartNode.querySelectorAll( '.a-select > select' );
    let filtered = data;
    let headerText = 'Total ' + title;
    let isFirst = true;

    for ( let i = 0; i < selects.length; i++ ) {
      const curr = selects[i];
      const { value } = curr;
      if ( value ) {
        if ( isFirst ) {
          headerText = attachPoint.dataset.title + ' for <b>' + value + '</b>';
          isFirst = false;
        } else {
          headerText = headerText + ' and <b>' + value + '</b>';
        }
      }

      filtered = chartHooks.filter(
        filtered, curr.dataset.key, value );
    }

    if ( transform ) {
      filtered = transform( filtered );
    }

    selectHeader.innerHTML = headerText;
    const applyHooks = styleOverrides && styleOverrides.match( 'hook__' );

    // TODO filter everything
    chart.series[0].setData( filtered, !applyHooks );

    if ( applyHooks ) {
      const obj = {};
      applyOverrides( styleOverrides, obj, filtered );
      chart.update( obj );
    }
  } );
}

/** Wires up select filters, if present
  * @param {object} dataset Data passed via data-* tags
  * @param {object} chartNode The DOM node of the current chart
  * @param {object} chart The initialized chart
  * @param {object} data The raw chart data, untransformed
  * @param {function} transform The transform function for this chart
  * */
// TODO data is currently raw
function initFilters( dataset, chartNode, chart, data, transform ) {
  let filters = dataset.filters;
  if ( !filters ) return;
  try {
    filters = JSON.parse( filters );
    const selects = [];
    if ( !Array.isArray( filters ) ) filters = [ filters ];
    filters.forEach( filter => {
      const options = getOptions( filter, data );
      selects.push( makeFilterDOM( options, chartNode, filter ) );
    } );
    if ( selects.length ) {
      makeSelectHeaderDOM( chartNode );
      selects.forEach( ( selectNode, i ) => {
        attachFilter(
          selectNode, chartNode, chart, dataset, filters[i], data, transform
        );
      } );
    }
  } catch ( err ) {
    console.error( err );
    console.error( 'Bad JSON in chart filters ', filters );
  }
}

/**
 * Initializes every chart on the page
 */
function buildCharts() {
  const charts = document.getElementsByClassName( 'o-simple-chart' );
  for ( let i = 0; i < charts.length; i++ ) {
    buildChart( charts[i] );
  }
}

/**
 * Initializes a chart
 * @param {object} chartNode The DOM node of the current chart
 */
function buildChart( chartNode ) {
  const target = chartNode.getElementsByClassName( 'simple-chart-target' )[0];
  const { source, transform } = target.dataset;

  resolveData( source.trim() ).then( raw => {
    const series = extractSeries( raw, target.dataset );
    const transformed = transform && chartHooks[transform] ?
      chartHooks[transform]( raw ) :
      null;

    const data = {
      raw,
      series,
      transformed
    };
    const chart = Highcharts.chart(
      target,
      makeChartOptions( data, target.dataset )
    );
    initFilters(
      target.dataset, chartNode, chart, raw, transform && chartHooks[transform]
    );
  } );
}

buildCharts();
