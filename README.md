# MN Election Results

Flask-based scraper for Minnesota elections with an API that returns JSON data for display on our election result dashboard. Structurally, this application is based on [this example](https://github.com/nebularazer/flask-celery-example), which itself is a restructuring of [this example](https://github.com/miguelgrinberg/flask-celery-example) and its [accompanying article](https://blog.miguelgrinberg.com/post/using-celery-with-flask).

## Data structure

### Data sources

* The Minnesota Secretary of State does a pretty good job of providing data across the state for general elections.
  * [Web election results](http://electionresults.sos.state.mn.us/). Finding an upcoming election can be difficult and may require manual manipulation of URLs.
  * http://electionresults.sos.state.mn.us/ENR/Select/Download/1
  * [FTP download results](ftp://media:results@ftp.sos.state.mn.us/).
  * The format of results are text, csv-like files. Unfortunately there is no header row and no metadata to know what fields are which. See `code/scraper.py` to see what is assumed.
* Minneapolis (due to Ranked-Choice voting)

### Adding an election

Metadata about each election is managed in `scraper_sources.json`.  Though there are often similarly named files for each election, there are usually files for each group of races and some can be named inconsistently.

Add a new object keyed by the date of the election, like `YYYYMMDD`.  This should contain objects for results and other supplemental tables.  There should be one entry per file needed to process.

```json
"20140812": {
  "meta": {
    "files_url": "ftp://media:results@ftp.sos.state.mn.us/20140812/",
    "primary": true
  },
  "us_house_results": {
    "url": "ftp://media:results@ftp.sos.state.mn.us/20140812/ushouse.txt",
    "table": "results",
    "type": "results",
    "results_scope": "us_house"
  },
```

In theory this should be it, assuming the scraper can reconcile everything. There is a good chance, though, that formatting changes could break the scraper, or that the scraper does not know how to fully process some results.

### Manual data

Both manual results and contest question text can be managed in Google Spreadsheets.

## Google Sheets to JSON API setup

For both local and remote environments, you'll need to have access to an instance of the [Google Sheets to JSON API](https://github.com/MinnPost/google-sheet-to-json-api) that itself has access to the Google Sheet(s) that you want to process. If you don't already have access to a working instance of that API, set it up and ensure it's working first.

### Credentials

To access the Google Sheets to JSON API you'll need to have two configuration values in your `.env` or in your Heroku settings.

- `AUTHORIZE_API_URL = "http://0.0.0.0:5000/authorize/"` (wherever the API is running, it uses an `authorize` endpoint)
- `PARSER_API_KEY = ""` (a valid API key that is accepted by the installation of the API that you're accessing)

### Configuration

Use the following additional fields in your `.env` or in your Heroku settings.

- `PARSER_API_URL = "http://0.0.0.0:5000/parser/"` (wherever the API is running, it uses a `parser` endpoint)
- `OVERWRITE_API_URL = "http://0.0.0.0:5000/parser/custom-overwrite/"` (wherever the API is running, it uses a `parser/custom-overwrite` endpoint)
- `PARSER_API_CACHE_TIMEOUT = "500"` (this value is how many seconds the customized cache should last. `0` means it won't expire.)
- `PARSER_STORE_IN_S3` (provide a "true" or "false" value to set whether the API should send the JSON to S3. If you leave this blank, it will follow the API's settings.)

## Local setup and development

1. Install `git`
1. Get the code: `git clone https://github.com/MinnPost/minnpost-scraper-mn-election-results.git`
1. Change the directory: `cd minnpost-scraper-mn-election-results`
1. Create a `.env` file based on the repository's `.env-example` file in the root of your project.
1. Run `pipenv install`.
1. Open up three command line tabs if you need to run the scheduled scraping tasks as well as the API. In each tab, run `pipenv shell`. See below section on Scraping data.
1. To process scrape tasks, either manually or on schedule, run `celery -A src.worker:celery worker -S redbeat.RedBeatScheduler --loglevel=INFO` in a tab. Include the `-E` flag to monitor task events that the worker receives.
1. To run the scheduled scraper, run `celery -A src.worker:celery beat -S redbeat.RedBeatScheduler --loglevel=INFO` in a tab.
1. In the tab where you want to run the Flask-based API, run `flask run --host=0.0.0.0`. This creates a basic endpoint server at http://0.0.0.0:5000.

### Local setup for Postgres

This documentation describes how to install Postgres with Homebrew.

1. Run `brew install postgresql` to install Postgres.
1. Run `psql postgres` to start the server and log in to it.
1. A free, Mac-based graphic manager for Postgres is [Postbird](https://www.electronjs.org/apps/postbird).
1. Create a database. For this example, call it `election-scraper`.
1. Installing with Homebrew creates a user with no password. The connection string will be `"postgresql://username:@localhost/election-scraper"`. Enter this connection string to the `DATABASE_URL` value of the `.env` file.
1. To set up the database tables and columns without any data, run `flask db upgrade` in a command line.

To get the data for the database, you can also [export it from Heroku](https://devcenter.heroku.com/articles/heroku-postgres-import-export).

**Note**: when the SQL structure changes, run `flask db migrate` and add any changes to the `migrations` folder to the Git repository.

See the scraper section below for commands to run after local setup is finished.

## Production setup and deployment

### Code, Libraries and prerequisites

This application should be deployed to Heroku. If you are creating a new Heroku application, clone this repository with `git clone https://github.com/MinnPost/minnpost-scraper-mn-election-results.git` and follow [Heroku's instructions](https://devcenter.heroku.com/articles/git#creating-a-heroku-remote) to create a Heroku remote.

### Production setup for Postgres

Add the Heroku Postgres add-on to the Heroku application. The amount of data that this scraper uses will require at least the `Hobby Basic` plan. Heroku allows two applications to share the same database. They provide [instructions](https://devcenter.heroku.com/articles/managing-add-ons#using-the-command-line-interface-attaching-an-add-on-to-another-app) for this.

To get the data into the database, you can either [import it into Heroku](https://devcenter.heroku.com/articles/heroku-postgres-import-export), either from the included `election-scraper-structure.sql` file or from your database once it has data in it.

If you want to create empty tables on Heroku, you can do that by running the `CREATE TABLE` and `CREATE INDEX` commands from the `election-scraper-structure.sql` files after you open a `heroku pg:psql` session. Then you can run the scraper to populate the database.

Run the scraper commands from the section below by following [Heroku's instructions](https://devcenter.heroku.com/articles/getting-started-with-python#start-a-console) for running Python commands. Generally, run commands on Heroku by adding `heroku run ` before the rest of the command listed below.

### Production setup for Celery

Once the application is deployed to Heroku, Celery will be ready to run. To enable it, run the command `heroku ps:scale worker=1`. See Heroku's [Celery deployment](https://devcenter.heroku.com/articles/celery-heroku#deploying-on-heroku).

## Scraping data

To run the scraper in the browser, use the following URLs:

- [areas](https://minnpost-mn-election-results.herokuapp.com/scraper/areas/)
- [contests](https://minnpost-mn-election-results.herokuapp.com/scraper/contests/)
- [meta](https://minnpost-mn-election-results.herokuapp.com/scraper/meta/)
- [questions](https://minnpost-mn-election-results.herokuapp.com/scraper/questions/)
- [results](https://minnpost-mn-election-results.herokuapp.com/scraper/results/)

**Note**: `ELECTION_DATE_OVERRIDE` is an optional override configuration value that can be added to `.env`. The newest election will be used if not provided. If an override is necessary, the value should be the key of the object in the `scraper_sources.json` file; for instance `20140812`.

### Command line

** this stuff is not up to date yet **

1. (optional) Remove old data as the scraper is not built to manage more than one election: `find command to dump database` (let's find out if this is still necessary)
1. Scrape areas: `python code/scraper.py scrape areas <ELECTION_DATE>`
  * This is something that only really needs to be done once, at least close to the election, as there little change it will change the day of the election.
1. Scrape questions: `python code/scraper.py scrape questions <ELECTION_DATE>`
1. Scrape the results: `python code/scraper.py scrape results <ELECTION_DATE>`
  * This is the core processing of the scraper will be run frequently.
1. Match contests to boundary area: `python code/scraper.py match_contests <ELECTION_DATE>`
1. (optional) To check each boundary ID against the boundary service: `python code/scraper.py check_boundaries`

## Accessing the API

To access the scraper's content in JSON format, use the following URLs. These URLs will return all of the contents of the respective models:

- [areas](https://minnpost-mn-election-results.herokuapp.com/api/areas)
- [contests](https://minnpost-mn-election-results.herokuapp.com/api/contests)
- [meta](https://minnpost-mn-election-results.herokuapp.com/api/meta)
- [questions](https://minnpost-mn-election-results.herokuapp.com/api/questions)
- [results](https://minnpost-mn-election-results.herokuapp.com/api/results)

By receiving parameters, the API can limit what is returned by the various endpoints. Each endpoint, unless otherwise noted, can receive data in `GET`, `POST`, and JSON formats.

### SQL query

This endpoint returns the result of a valid `select` SQL query. For example, to run the query `select * from meta`, use the URL [https://minnpost-mn-election-results.herokuapp.com/api/query/?q=select%20*%20from%20meta].

### Areas

The Areas endpoint can receive `area_id` and `area_group` parameters.

- Area ID: [https://minnpost-mn-election-results.herokuapp.com/api/areas/?area_id=precincts-69-0770]
- Area Group: [https://minnpost-mn-election-results.herokuapp.com/api/areas/?area_group=municipalities]

### Contests

The Contests endpoint can receive `title`, `contest_id`, and `contest_ids` (for multiple contests) parameters.

- Contest ID: [https://minnpost-mn-election-results.herokuapp.com/api/contests/?contest_id=id-MN---02872-1001]
- Contest Title: [https://minnpost-mn-election-results.herokuapp.com/api/contests/?title=governor]
- Contest IDs: [https://minnpost-mn-election-results.herokuapp.com/api/contests/?contest_ids=id-MN---43000-2001,id-MN---43000-1131,id-MN---43000-1132,id-MN---43000-1133,id-MN---58000-1131,id-MN---43000-2121,id-MN---43000-2181,id-MN---43000-2191]

### Meta

The Meta endpoint receives a `key` parameter. It works like this: [https://minnpost-mn-election-results.herokuapp.com/api/api/meta/?key=base_url].

### Questions

The Questions endpoint can receive a `question_id` and `contest_id` parameters.

- Question ID: [https://minnpost-mn-election-results.herokuapp.com/api/questions/?question_id=id-82-1131-13456-]
- Contest ID: [https://minnpost-mn-election-results.herokuapp.com/api/questions/?contest_id=id-MN---13456-1131]

### Results

The Results endpoint can receive `result_id` and `contest_id` parameters.

- Result ID: [https://minnpost-mn-election-results.herokuapp.com/api/results/?result_id=id-MN---02872-1001-9901]
- Contest ID: [https://minnpost-mn-election-results.herokuapp.com/api/results/?contest_id=id-MN---02872-1001]


# stuff we have to build, still

## Scheduling

We need to run the scraper commands at intervals that differ based on which command it is and whether we're in the result hour window on Election Day. I think this is working well, but needs to be documented.

Set the result hour window by adding a datetime value to `ELECTION_RESULT_DATETIME_START` and `ELECTION_RESULT_DATETIME_END`. If you're developing locally, add these values to your `.env` file; in production, add it to the Heroku settings for the application. The code will check to make sure these are both actual `datetime`s and that the window between them is a valid timespan; if it is not a valid time window it will act as it does normally.

To manually turn the result hour window on, regardless of the time window, set the `ELECTION_RESULT_DATETIME_OVERRIDDEN` setting to `True`.

I think this is part working well, but needs to be documented above.

### Run daily, except during result hours on Election Day

- `python code/scraper.py scrape areas <ELECTION_DATE>`
- `python code/scraper.py scrape questions <ELECTION_DATE>`
- `python code/scraper.py scrape results <ELECTION_DATE>`
- `python code/scraper.py match_contests <ELECTION_DATE>` 

I think this is part working well, but needs to be documented above.

### Don't run, currently

- `python code/scraper.py check_boundaries`


## Caching

- I think the scraper should never return a cache. It should always return new data from the secretary of state or the spreadsheet API or wherever.
- The API should return a cache based on its configuration.
- The scraper should invalidate the API cache when it finishes running, if there is one.


## Metadata structure

Once we have the new dashboard fully ready, we should change the metadata structure so each election has its own row, rather than the whole database only having one set of election metadata.

This will change the scraper, the API response, and anything that is consuming it.
