class Settings:
    def __init__(self):
        pass

    REVIEWS_FILE = '/home/rt/wrk/w209/yelp/data/reviews.json'
    MONGO_CONNECTION_STRING = "mongodb://localhost:27017/"
    REVIEWS_DATABASE = "yelp"
    TAGS_DATABASE = "tags"
    REVIEWS_COLLECTION = "reviews"
    CORPUS_COLLECTION = "corpus"
    DATA = '/home/rt/wrk/w209/yelp/data'