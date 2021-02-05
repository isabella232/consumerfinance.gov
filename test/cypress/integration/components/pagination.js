import { Pagination } from '../../components/pagination';

const page = new Pagination();

describe( 'Pagination molecule to navigate on the filterable pages', () => {
  beforeEach( () => {
    cy.visit( '/about-us/blog/' );
  } );
  it( 'should be able to navigate to the next page', () => {
    // When I click on the "next" button
    page.clickButton( 'next' );
    // Then the page url should contain "page=2"
    cy.url().should( 'include', 'page=2' );
  } );
  it( 'should be able to navigate to the second page', () => {
    // When I enter "2" in the page input field
    page.enter( '2' );
    // And I click on the "submit" button
    page.clickButton( 'submit' );
    // Then the page url should contain "page=2"
    cy.url().should( 'include', 'page=2' );
  } );
  it( 'should be able to navigate to the last page', () => {
    // When I enter "54" in the page input field
    page.enter( '54' );
    // And I click on the "submit" button
    page.clickButton( 'submit' );
    // Then the page url should contain "page=54"
    cy.url().should( 'include', 'page=54' );
  } );
  it( 'should be able to navigate to the previous page', () => {
    // When I click on the "next" button
    page.clickButton( 'next' );
    // And I click on the "previous" button
    page.clickButton( 'prev' );
    // Then the page url should contain "page=1"
    cy.url().should( 'include', 'page=1' );
  } );
  it( 'should be able to navigate to the first page', () => {
    // When I click on the "next" button
    page.clickButton( 'next' );
    // When I enter "1" in the page input field
    page.enter( '1' );
    // And I click on the "submit" button
    page.clickButton( 'submit' );
    // Then the page url should contain "page=1"
    cy.url().should( 'include', 'page=1' );
  } );
} );
