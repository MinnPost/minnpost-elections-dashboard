#!/bin/sh

CODE_PATH=/home/ubuntu/minnpost-scraper-mn-election-results

if ps -ef | grep -v grep | grep scraper.py ; then
    exit 0
else
    cd $CODE_PATH && python $CODE_PATH/code/scraper.py scrape results
fi
