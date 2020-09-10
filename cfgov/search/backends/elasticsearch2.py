from wagtail.search.backends.elasticsearch2 import (
    Elasticsearch2Mapping,
    Elasticsearch2SearchBackend,
    Elasticsearch2SearchResults,
)

from search.backends.elasticsearch7 import (
    ElasticsearchSuggestionMappingMixin,
    ElasticsearchSuggestionSearchResultsMixin
)


class CFGOVElasticsearch2SuggestionMapping(
    ElasticsearchSuggestionMappingMixin, Elasticsearch2Mapping
):
    pass


class CFGOVElasticsearch2SearchResults(
    ElasticsearchSuggestionSearchResultsMixin,
    Elasticsearch2SearchResults
):
    pass


class CFGOVElasticsearch2SearchBackend(Elasticsearch2SearchBackend):
    mapping_class = CFGOVElasticsearch2SuggestionMapping
    results_class = CFGOVElasticsearch2SearchResults


SearchBackend = CFGOVElasticsearch2SearchBackend
