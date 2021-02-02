export class Multiselect {

  click() {
    return cy.get( '.o-expandable_target' ).click();
  }

  multiSelect( name ) {
    return cy.get( `.o-multiselect_${ name }` ).first();
  }

  choices() {
    return this.multiSelect( 'choices' );
  }

  header() {
    return this.multiSelect( 'header' );
  }

  searchInput() {
    return this.multiSelect( 'search' );
  }

  fieldSet() {
    return this.multiSelect( 'fieldset' );
  }

  optionsField() {
    return this.multiSelect( 'options' );
  }

  clickSearchInput() {
    return this.searchInput().click( { force: true } );
  }

  enterSearchInput( name ) {
    return this.searchInput().clear().type( name );
  }

  selectedTags = [];

  async areTagSelected() {
    const tagsSelected = this.selectedTags.length;
    const selectedTagsCount = await displayedTag().length;

    return tagsSelected !== 0 || selectedTagsCount !== 0;
  }

  clearTags() {
    this.selectedTags = [];

    return this.selectedTags;
  }

  dropDownValue( value ) {
    return cy.get( `li[data-option="${ value }"].u-filter-match` );
  }

  async dropDownHasValue( value ) {
    const selector = `li[data-option="${ value }"].u-filter-match`;
    const selectedTagsCount = await cy.get( selector ).length;
    return selectedTagsCount > 0;
  }

  choicesElement() {
    return cy.get( '.o-multiselect_choices label' );
  }

  choicesElementClick() {
    return this.choicesElement().first().click( { force: true } );
  }

  dropDown() {
    return cy.get( '.o-multiselect .u-filter-match' );
  }

  dropDownLabel() {
    return cy.get( '.o-multiselect_options li .o-multiselect_label' );
  }

  dropDownLabelClick() {
    return this.dropDownLabel().first().click( { force: true } );
  }

  displayedTag() {
    return cy.get( '.o-multiselect_choices li' );
  }

  isRendered() {
    return cy.get( '.o-multiselect' ).first().should( 'be.visible' );
  }
}
