from wagtail.search.backends.elasticsearch7 import (
    Elasticsearch7Mapping, Elasticsearch7SearchBackend,
    Elasticsearch7SearchResults
)

from search.fields import SuggestionSearchField


class ElasticsearchSuggestionMappingMixin:
    suggestion_analyzer_config = {
        "analyzer": "synonym_en",
    }

    def get_field_mapping(self, field):
        field_column_name, mapping = super().get_field_mapping(field)

        if isinstance(field, SuggestionSearchField):
            mapping.update(self.suggestion_analyzer_config)

        return field_column_name, mapping


class ElasticsearchSuggestionSearchResultsMixin:
    def suggestions(self):
        params = {
            'index': self.backend.get_index_for_model(
                self.query_compiler.queryset.model
            ).name,
            'body': {
                "query": {
                    "match": {
                        "message": self.query_compiler.query.query_string
                    }
                },
                "suggest": {
                    "suggestions": {
                        "text": self.query_compiler.query.query_string,
                        "term": {
                            "field": "_all_text"
                        }
                    }
                }
            },
            '_source': False,
        }
        results = self.backend.es.search(**params)
        suggestions = results["suggest"].get("suggestions")
        if suggestions:
            return [
                s["text"]
                if len(s["options"]) == 0
                else s["options"][0]["text"]
                for s in suggestions
            ]


class CFGOVElasticsearch7SuggestionMapping(
    ElasticsearchSuggestionMappingMixin, Elasticsearch7Mapping
):
    pass


class CFGOVElasticsearch7SearchResults(
    ElasticsearchSuggestionSearchResultsMixin,
    Elasticsearch7SearchResults
):
    pass


class CFGOVElasticsearch7SearchBackend(Elasticsearch7SearchBackend):
    mapping_class = CFGOVElasticsearch7SuggestionMapping
    results_class = CFGOVElasticsearch7SearchResults


# SearchBackend = CFGOVElasticsearch7SearchBackend
