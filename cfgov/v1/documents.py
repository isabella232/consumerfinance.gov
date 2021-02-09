from django.utils.html import strip_tags

from django_elasticsearch_dsl import Document, fields
from django_elasticsearch_dsl.registries import registry

from html import unescape

from itertools import chain

import json

from v1.models.base import CFGOVAuthoredPages, CFGOVPageCategory, CFGOVTaggedPages
from v1.models.blog_page import BlogPage
from v1.models.learn_page import AbstractFilterPage, DocumentDetailPage, EventPage
from v1.models.enforcement_action_page import EnforcementActionPage

@registry.register_document
class FilterablePagesDocument(Document): 
    
    tags = fields.ObjectField(properties={
        'slug': fields.KeywordField()
    })
    categories = fields.ObjectField(properties={
        'name': fields.KeywordField()
    })
    authors = fields.ObjectField(properties={
        'name': fields.TextField(),
        'slug': fields.KeywordField()
    })
    title = fields.TextField(attr='title')
    is_archived = fields.TextField(attr='is_archived')
    content = fields.TextField()
    date_published = fields.DateField(attr='date_published')
    url = fields.KeywordField()
    start_dt = fields.DateField()
    end_dt = fields.DateField()
    statuses = fields.KeywordField()
    initial_filing_date = fields.DateField()
    related_metadata_tags = fields.TextField()

    def get_queryset(self):
        return AbstractFilterPage.objects.live().public()

    def prepare_content(self, instance):
        try:
            content_field = instance._meta.get_field('content')
            value = content_field.value_from_object(instance)
            content = content_field.get_searchable_content(value)
            # get_serachable_content returns a single-item list for a RichTextField
            # so we want to pop out the one item to just get a regular string
            content = content.pop()
            return content
        except:
            return None

    def prepare_url(self, instance):
        return instance.url

    def prepare_start_dt(self, instance):
        try:
            return instance.specific.start_dt
        except:
            return None

    def prepare_end_dt(self, instance):
        try:
            return instance.specific.end_dt
        except:
            return None

    def prepare_statuses(self, instance):
        try:
            return [status.status for status in instance.specific.statuses.all()]
        except:
            return None

    def prepare_initial_filing_date(self, instance):
        try:
            return instance.specific.initial_filing_date
        except:
            return None
    
    def prepare_related_metadata_tags(self, instance):
        return json.dumps(instance.related_metadata_tags())

    def get_instances_from_related(self, related_instance):
        """If related_models is set, define how to retrieve the Car instance(s) from the related model.
        The related_models option should be used with caution because it can lead in the index
        to the updating of a lot of items.
        """
        if isinstance(related_instance, CFGOVAuthoredPages):
            return related_instance.authors.all()
        if isinstance(related_instance, CFGOVPageCategory):
            return related_instance.categories.all()
        if isinstance(related_instance, CFGOVTaggedPages):
            return related_instance.tags.all()

    class Django:
        model = AbstractFilterPage

        related_models = [
            CFGOVAuthoredPages,
            CFGOVPageCategory,
            CFGOVTaggedPages
        ]

    class Index:
        name = 'test'


class FilterablePagesDocumentSearch:
    
    def __init__(self,
                 prefix='/', topics=[], categories=[],
                 authors=[], to_date=None, from_date=None,
                 title=''):
         self.prefix = prefix
         self.topics = topics
         self.categories = categories
         self.authors = authors
         self.to_date = to_date
         self.from_date = from_date
         self.title = title

    def filter_topics(self, search):
        return search.filter("terms", tags__slug=self.topics)

    def filter_categories(self, search):
        return search.filter("terms", categories__name=self.categories)

    def filter_authors(self, search):
        return search.filter("terms", authors__slug=self.authors)

    def filter_date(self, search):
        return search.filter("range", **{'date_published': {'gte': self.from_date, 'lte': self.to_date}})

    def search_title(self, search):
        return search.query(
                "match", title={"query": self.title, "operator": "AND"}
            )

    def order_results(self, search):
        total_results = search.count()
        return search.sort('-date_published')[0:total_results]

    def has_dates(self):
        return self.to_date != None and self.from_date != None

    def apply_specific_filters(self, search):
        return search


    def search(self):
        search = FilterablePagesDocument.search()
        if self.prefix != '':
            search = search.filter('prefix', url=self.prefix)
        if self.topics not in ([], '', None):
            search = self.filter_topics(search)
        if self.categories not in ([], '', None):
            search = self.filter_categories(search)
        if self.authors not in ([], '', None):
            search = self.filter_authors(search)
        if self.has_dates:
            search = self.filter_date(search)
        if self.title not in ([], '', None):
            search = self.search_title(search)
            
        search = self.apply_specific_filters(search)
        results = self.order_results(search)
        return results.to_queryset()

class EventFilterablePagesDocumentSearch(FilterablePagesDocumentSearch):
    
    def filter_date(self, search):
        return search.filter("range", **{'start_dt': {'gte': self.from_date}}).filter("range", **{'end_dt': {'lte': self.to_date}})

class EnforcementActionFilterablePagesDocumentSearch(FilterablePagesDocumentSearch):

    def __init__(self,
                 prefix='/', topics=[], categories=[],
                 authors=[], to_date=None, from_date=None,
                 title='', statuses=[]):
        super(EnforcementActionFilterablePagesDocumentSearch, self).__init__(
            prefix, topics, categories, authors, to_date, from_date, title
        )
        self.statuses = statuses


    def filter_date(self, search):
        return search.filter("range", **{"initial_filing_date": {"gte": self.from_date, "lte": self.to_date}})

    def apply_specific_filters(self, search):
        if self.statuses != []:
            return search.filter("terms", statuses=self.statuses)
        
        return search
    
    def order_results(self, search):
        total_results = search.count()
        return search.sort('-initial_filing_date')[0:total_results]