#!/usr/bin/python

# basic libraries
import json
import nltk
import string
import os

# nltk
from nltk.corpus import stopwords
from nltk.tokenize import RegexpTokenizer
from nltk.stem import WordNetLemmatizer
from nltk.stem.porter import PorterStemmer

# collections
from collections import defaultdict
from collections import Counter

# elasticsearch
from elasticsearch import Elasticsearch

# alchemy for language analysis
from alchemyapi import AlchemyAPI

# import life savers
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# utility function to parse and return json
def process_json(filename):
    result = []

    infile = open(filename,"r")

    for line in infile:
        result = json.loads( line.strip() )
        if 'create' in result:
            continue
        yield result

# process file by tokenizing, lemmatizing each review and perform nlp using
# Alchemy API for sentiment analysis and tagging
def process_review(src_file_name, tgt_file_name):
    print "processing file name {}".format(src_file_name)

    # find distinct businesses
    ids_hash = defaultdict(list)
    ids = defaultdict(list)

    # initialize tokenizer, stemmer and lemmatizer
    tokenization_pattern = r'''(?x)    # set flag to allow verbose regexps
    ([A-Z]\.)+        # abbreviations, e.g. U.S.A.
    | \w+(-\w+)*        # words with optional internal hyphens
    | \$?\d+(\.\d+)?%?  # currency and percentages, e.g. $12.40, 82%
    | \w+[\x90-\xff]  # these are escaped emojis
    | [][.,;"'?():-_`]  # these are separate tokens
    '''
    word_tokenizer = nltk.tokenize.regexp.RegexpTokenizer(tokenization_pattern)
    porter_stemmer = PorterStemmer()
    wordnet_lemmatizer = WordNetLemmatizer()

    # loop through each review and perform cleansing
    for item in process_json(src_file_name):
        # tokenize
        tokens = word_tokenizer.tokenize(item['text'].lower())
        # remove stopwords
        normalized = [w for w in tokens if w.lower() not in stopwords.words('english')]
        # stemmer
        #stemmed_reviews.append(' '.join(map(porter_stemmer.stem, normalized)))
        # lemmatize
        treated_review = ' '.join(map(wordnet_lemmatizer.lemmatize, normalized))
        # append cleansed review to a list
        ids_hash[(item['business_id'], item['stars'])].append(treated_review)
        ids[item['business_id']] = item['business_id']

    print "Length of treated reviews = {}".format(len(ids_hash))

    # perform nlp by calling Alchemy API
    nlp_process(ids, ids_hash, tgt_file_name)

# perform nlp by calling Alchemy API and calculate sentiment polarity with strength
def nlp_process(ids,ids_hash, tgt_file_name):
    # instantiate an elasticsearch client
    #es = Elasticsearch()

    outfile = open(tgt_file_name, 'w')

    # instantiate an alchemy client
    alchemyapi = AlchemyAPI()

    # loop through each business
    for business_id in ids:
        # loop through reviews for each star
        for star in range(1,6):

            # combine review text from all reviews rated same score
            print "processing business {} for review with {} star(s)".format(business_id, star)
            data = '.'.join(ids_hash[(business_id, star)])
            alchem_keywords = []
            alchem_concepts = []

            # perform analysis only if combined review length across all the reviews
            # within a star is more than 100 characters
            if len(data) >= 100:
                # call Alchemy API combined call to determing keywords, sentiment
                # and concepts (tags)
                response = alchemyapi.combined('text', data, {'sentiment': 1, 'maxRetrieve': 100})

                # process response
                if response['status'] == 'OK':
                    print('#Success#')

                    # process keywords
                    for keyword in response['keywords']:
                        al_temp = defaultdict()

                        al_temp['text'] = keyword['text'].encode('utf-8')
                        al_temp['relevance'] = keyword['relevance']
                        al_temp['sentiment'] = keyword['sentiment']['type']

                        if 'score' in keyword['sentiment']:
                            al_temp['score'] = keyword['sentiment']['score']

                        alchem_keywords.append(al_temp)

                    # process concepts/tags
                    for keyword in response['concepts']:
                        al_temp = defaultdict()

                        al_temp['text'] = keyword['text'].encode('utf-8')
                        al_temp['relevance'] = keyword['relevance']

                        alchem_concepts.append(al_temp)
                else:
                    print('Error in keyword extaction call: ', response['statusInfo'])
                print len(alchem_keywords), len(alchem_concepts)

                # prepare body for insertion
                doc = {
                    "business_id" : business_id,
                    "stars": star,
                    "word_freq": alchem_keywords,
                    "topics": alchem_concepts
                }

                # write to a file
                json.dump(doc, outfile)
                outfile.write('\n')

# pretty print nlp results
def nlp_results(file_name):
    infile = open(file_name, "r")

    business_names = { k:v for k, v in (line.split("~")[0:2] for line in open(os.path.join(DATA_DIR, 'businesses.txt')).read().strip().split('\n')) }

    for line in infile.readlines():
        line = json.loads( line.strip() )

        print "="*80
        print "business_id : {} | stars: {}".format(business_names.get(line['business_id'], line['business_id']), line['stars'])
        print "="*80

        print "concepts"
        print "-"*80
        print "{0: <50} | {1}".format('text', 'relevance')
        print "-"*80
        for items in line['topics']:
            #print items
            print "{0: <50} | {1}".format(items['text'].encode('utf-8'), items['relevance'])
        print "-"*80

        print "keywords"
        print "-"*80
        print "{0: <50} | {1: <10} | {2: <10} | {3}".format('text', 'sentiment', 'score', 'relevance')
        print "-"*80
        positive = []
        negative = []
        for items in line['word_freq']:
            if items['sentiment'] == 'positive':
                positive.append( (items['score'], items['text']))
            if items['sentiment'] == 'negative':
                negative.append( (items['score'], items['text']))

        top_positive = sorted(positive, key=lambda x: x[0], reverse=True)[:10]
        top_negative = sorted(negative, key=lambda x: x[0], reverse=True)[:10]

        for (score, text) in top_positive:
            print "{0: <50} | {1: <10} | {2}".format(text, 'positive', score)
        for (score, text) in top_negative:
            print "{0: <50} | {1: <10} | {2}".format(text, 'negative', score)

        print "-"*80

if __name__ == '__main__':
    # initialization
    DATA_DIR = '/home/rt/wrk/w209/yelp/data'
    #src_file_name = os.path.join(DATA_DIR, 'mon.ami.gabi.reviews.json')
    #tgt_file_name = os.path.join(DATA_DIR, 'analysis.mon.ami.gabi.out')
    #src_file_name = os.path.join(DATA_DIR, 'phoenix_bars.json')
    #tgt_file_name = os.path.join(DATA_DIR, 'analysis.phoenix_bars.out')

    src_file_name = os.path.join(DATA_DIR, 'NV_reviews.json')
    tgt_file_name = os.path.join(DATA_DIR, 'analysis.NV_reviews.out')

    process_review(src_file_name, tgt_file_name)
