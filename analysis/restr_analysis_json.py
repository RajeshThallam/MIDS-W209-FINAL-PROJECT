#!/usr/bin/python

# basic libraries
import json
import os

def restructure_json(src_file_name, tgt_file_name):
    
    outfile = open(tgt_file_name, 'w')
    
    infile = open(src_file_name, "r")
    reviews = {}
    
    print 'reading'
    for line in infile.readlines():
        line = json.loads( line.strip() )

        if line['business_id'] not in reviews:
            reviews[line['business_id']] = [{'word_freq': line['word_freq'], 'stars':line['stars']}]
        else:
            reviews[line['business_id']].append({'word_freq': line['word_freq'], 'stars':line['stars']})
        
    print 'writing'
    for review in reviews:
        out_json = {}
        out_json['business_id'] = review
        out_json['topics'] = reviews[review]
        json.dump(out_json, outfile)
        print review
        outfile.write('\n')

if __name__ == '__main__':
    # initialization
    DATA_DIR = '/home/rt/wrk/w209/yelp/data'
    restructure_json(os.path.join(DATA_DIR, 'analysis.NV_reviews.out'), os.path.join(DATA_DIR, 'analysis.NV_reviews.json'))
