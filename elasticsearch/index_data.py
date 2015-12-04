__author__ = 'ssatpati'

import sys
import json
import elasticsearch
from elasticsearch import helpers
import pprint


ROOT_DIR = '/Users/ssatpati/0-DATASCIENCE/DEV/github/viz/yelp_dataset_challenge_academic_dataset'
#ROOT_DIR = '/home/ubuntu/data/yelp_dataset_challenge_academic_dataset'
BATCH_SIZE = 50*2

es = elasticsearch.Elasticsearch()  # use default of localhost, port 9200


INDEX_NAME = 'yelp'
INDEX_TYPE_BUSINESS = 'business'
INDEX_TYPE_USER = 'user'
INDEX_TYPE_REVIEW = 'review'
INDEX_TYPE_CHECKIN = 'checkin'
INDEX_TYPE_TIP = 'tip'
INDEX_TYPE_TOPIC = 'topic'

index = {
        'types': [
                {
                    'type': INDEX_TYPE_BUSINESS,
                    'file': 'yelp_academic_dataset_business.json',
                    'id': 'business_id',
                    'update': False
                },
                {
                    'type': INDEX_TYPE_USER,
                    'file': 'yelp_academic_dataset_user.json',
                    'id': 'user_id',
                    'update': False
                },
                {
                    'type': INDEX_TYPE_REVIEW,
                    'file': 'yelp_academic_dataset_review.json',
                    'id': 'review_id',
                    'update': False
                },
                {
                    'type': INDEX_TYPE_CHECKIN,
                    'file': 'yelp_academic_dataset_checkin.json',
                    'id': 'business_id',
                    'update': False
                },
                {
                    'type': INDEX_TYPE_TOPIC,
                    'file': 'analysis.NV_reviews.json',
                    'id': 'business_id',
                    'update': True
                }
            ]
        }


def create_delete_index(index_name, create=False):

    if not create:
        print('### Skipping Index Creation: {0}'.format(index_name))
        return

    try:
        if es.indices.exists(index_name):
            print("deleting '%s' index..." % (index_name))
            res = es.indices.delete(index = index_name)
            print(" response: '%s'" % (res))

        # since we are running locally, use one shard and no replicas
        # Create a Geo Index for Business
        request_body = {
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0
            },
            "mappings" : {
              "business" : {
                "properties": {
                  "location": {
                    "type": "geo_point"
                  }
                }
              }
            }
        }

        print("creating '%s' index..." % (INDEX_NAME))
        res = es.indices.create(index = INDEX_NAME, body = request_body)
        print(" response: '%s'" % (res))
    except Exception as e:
        print e
        sys.exit(1)


def process_data(type, data_dict):
    """Massage Data for Certain Index Types"""
    if type == INDEX_TYPE_BUSINESS:
        data_dict[u'location'] = {
                                        u'lat': data_dict['latitude'],
                                        u'lon': data_dict['longitude']
                                 }


def build_index(type, file, id):
    batch = []
    cnt = 0
    with open('{0}/{1}'.format(ROOT_DIR, file), 'r') as f:
        for line in f:
            if not line:
                continue
            cnt += 1

            data_dict = json.loads(line)

            # Special Processing for Business
            process_data(type, data_dict)

            op_dict = {
                "index": {
                    "_index": INDEX_NAME,
                    "_type": type,
                    "_id": data_dict[id]
                }
            }
            batch.append(op_dict)
            batch.append(data_dict)

            if len(batch) == BATCH_SIZE:
                print "[{0}] Bulk Update Init, Number of records indexed: {1}".format(type, cnt)
                es.bulk(index=INDEX_NAME, body=batch, refresh=True)
                del batch[:]

    # Rest of the Batch
    print "[{0}] Bulk Update Init, Number of records indexed: {1}".format(type, cnt)
    es.bulk(index=INDEX_NAME, body=batch, refresh=True)


if __name__ == '__main__':
    '''Main Point of Entry to Program'''
    #Create/Drop Index
    create_delete_index(INDEX_NAME, create=False)

    for type in index['types']:
        if type['update']:
            build_index(type['type'], type['file'], type['id'])
        else:
            print('~ Skipping Updating Type: {0}'.format(type['type']))
