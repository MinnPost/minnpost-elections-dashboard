#!/bin/sh

if ps -ef | grep -v grep | grep scraper.py ; then
    exit 0
else
    python /home/ubuntu/minnpost-scraper-mn-election-results/code/scraper.py scrape results
fi
