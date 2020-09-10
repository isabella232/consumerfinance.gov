UNSAFE_CHARACTERS = [
    '#', '%', ';', '^', '~', '`', '|',
    '<', '>', '[', ']', '{', '}', '\\'
]


def make_safe(term):
    for char in UNSAFE_CHARACTERS:
        term = term.replace(char, '')
    return term


class AskSearch:
    def __init__(self, search_term, query_base=None, language='en'):
        self.query_base = query_base.filter(language=language)
        self.search_term = make_safe(search_term).strip()
        self.queryset = self.query_base.search(
            self.search_term, backend='elasticsearch'
        )
        suggestions = self.queryset.suggestions()
        self.suggestion = suggestions[0] if len(suggestions) > 0 else None

    def suggest(self, request):
        suggestions = self.queryset.suggestions()
        suggestion = suggestions[0] if len(suggestions) > 0 else None
        if (
            suggestion and suggestion != self.search_term and
            request.GET.get('correct', '1') == '1'
        ):
            self.queryset = self.query_base.filter(content=suggestion)
            self.search_term, self.suggestion = suggestion, self.search_term
