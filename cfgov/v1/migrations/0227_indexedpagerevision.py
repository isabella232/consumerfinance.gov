# Generated by Django 2.2.13 on 2020-07-23 14:38

from django.db import migrations
import wagtail.search.index


class Migration(migrations.Migration):

    dependencies = [
        ('wagtailcore', '0041_group_collection_permissions_verbose_name_plural'),
        ('v1', '0226_update_enforcement_action_data'),
    ]

    operations = [
        migrations.CreateModel(
            name='IndexedPageRevision',
            fields=[
            ],
            options={
                'proxy': True,
                'indexes': [],
                'constraints': [],
            },
            bases=(wagtail.search.index.Indexed, 'wagtailcore.pagerevision'),
        ),
    ]
