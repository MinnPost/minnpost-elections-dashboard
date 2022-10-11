# MN Election Results

Flask-based scraper for Minnesota elections with an API that returns JSON data for display on our election result dashboard. Structurally, this application is based on [this example](https://github.com/nebularazer/flask-celery-example), which itself is a restructuring of [this example](https://github.com/miguelgrinberg/flask-celery-example) and its [accompanying article](https://blog.miguelgrinberg.com/post/using-celery-with-flask).

## Data structure

### Data sources

* The Minnesota Secretary of State does a pretty good job of providing data across the state for general elections.
  * [Web election results](http://electionresults.sos.state.mn.us/). Finding an upcoming election can be difficult and may require manual manipulation of URLs.
  * http://electionresults.sos.state.mn.us/ENR/Select/Download/1
  * [FTP download results](ftp://media:results@ftp.sos.state.mn.us/).
  * The format of results are text, csv-like files. Unfortunately there is no header row and no metadata to know what fields are which. See `src/scraper/models.py` to see what is assumed.
* Minneapolis (due to Ranked-Choice voting)

Boundary data, for drawing maps and plotting locations, comes from [Represent Minnesota](https://github.com/minnpost/represent-minnesota). By default, it assumes we're using https://represent-minnesota.herokuapp.com but this is configurable by a `.env` value, `BOUNDARY_SERVICE_URL`.

### Adding an election

Metadata about each election is managed in `scraper_sources.json`. Though there are often similarly named files for each election, there are usually files for each group of races and some can be named inconsistently.

Add a new object keyed by the date of the election, like `YYYYMMDD`. This should contain objects for results and other supplemental tables. There should be one entry per file needed to process.

```json
"20140812": {
  "meta": {
    "date": "2014-08-12",
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

The current version of `scraper_sources.json` only works with this application as far back as the `20200303` key. Older elections run into scrape errors. Elections older than 2020 likely are using incorrect boundary sets due to redistricting.

### Manual data

Both manual results and contest question text can be managed in Google Spreadsheets.

A good example of an election's JSON entry with manual data stored in a spreadsheet is:

```json
"20211102": {
  "meta": {
    "base_url": "https://electionresultsfiles.sos.state.mn.us/20211102/",
    "date": "2021-11-02",
    "primary": false
  },
  [the standard entries],
  "raw_csv_supplemental_results": {
    "url": "https://s3.amazonaws.com/data.minnpost/projects/minnpost-mn-election-supplements/2021/Election+Results+Supplement+2021-11-02+-+Results.csv",
    "type": "raw_csv"
  },
  "raw_csv_supplemental_contests": {
    "url": "https://s3.amazonaws.com/data.minnpost/projects/minnpost-mn-election-supplements/2021/Election+Results+Supplement+2021-11-02+-+Contests.csv",
    "type": "raw_csv"
  },
  "supplemental_contests": {
    "spreadsheet_id": "1Jkt6UzHh-3h_sT_9VQ2GWu4It9Q96bQyL00j5_R0bqg",
    "worksheet_id": 0,
    "notes": "Worksheet ID is the zero-based ID from the order of workssheets and is used to find the actual ID."
  },
  "supplemental_results": {
    "spreadsheet_id": "1Jkt6UzHh-3h_sT_9VQ2GWu4It9Q96bQyL00j5_R0bqg",
    "worksheet_id": 1
  }
}
```

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
1. To process scrape tasks, either manually or on schedule, run `celery -A src.worker:celery worker -S redbeat.RedBeatScheduler --loglevel=INFO` in a tab. Include the `-E` flag to monitor task events that the worker receives. When this command runs, the initial scraper tasks should also run, after which they should run on schedule.
1. To run the scheduled scraper tasks, run `celery -A src.worker:celery beat -S redbeat.RedBeatScheduler --loglevel=INFO` in a tab.
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

### Local setup for Celery

This documentation describes how to install our Celery requirements with Homebrew.

1. Run `brew install redis` to install Redis.
1. By default, the Redis credentials are used like this: `redis://127.0.0.1:6379/0`. Replace `0` with another number if you are already using Redis for other purposes and would like to keep the databases separate. Whatever value you use, put it into the `REDIS_URL` value of your `.env` file.
1. By default, this application uses Redis for the application cache and for the Celery backend. If you'd like to use something else for the Celery backend, add a different value to `RESULT_BACKEND` in your `.env` file.
1. Run `brew install rabbitmq` to install RabbitMQ.
1. By default, RabbitMQ credentials are used like this: `amqp://guest:guest@127.0.0.1:5672`. We store it in the `CLOUDAMQP_URL` `.env` value, as this matches Heroku's use of the `CloudAMQP` add-on.
1. By default, this application uses `CloudAMQP` as the Celery broker. If you'd like to use something else, add a different value to the `CELERY_BROKER_URL` value.

**Note**: in a local environment, it tends to be fine to use Redis in place of RabbitMQ, but this does not work with Heroku's free Redis plan.

**Note**: if the application changes its task structure and Celery tries to run old tasks, run the `celery purge` command from within the application's virtualenv.

## Production setup and deployment

### Code, Libraries and prerequisites

This application should be deployed to Heroku. If you are creating a new Heroku application, clone this repository with `git clone https://github.com/MinnPost/minnpost-scraper-mn-election-results.git` and follow [Heroku's instructions](https://devcenter.heroku.com/articles/git#creating-a-heroku-remote) to create a Heroku remote.

### Production setup for Postgres

Add the `Heroku Postgres` add-on to the Heroku application. The amount of data that this scraper uses will require at least the `Hobby Basic` plan. Heroku allows two applications to share the same database. They provide [instructions](https://devcenter.heroku.com/articles/managing-add-ons#using-the-command-line-interface-attaching-an-add-on-to-another-app) for this.

To get the data into the database, you can either [import it into Heroku](https://devcenter.heroku.com/articles/heroku-postgres-import-export), either from the included `election-scraper-structure.sql` file or from your database once it has data in it.

If you want to create an empty installation of the Flask database structure, or if the database structure changes and the changes need to be added to Heroku, run `heroku run flask db upgrade`. Flask's migration system will create all of the tables and relationships.

Run the scraper commands from the section below by following [Heroku's instructions](https://devcenter.heroku.com/articles/getting-started-with-python#start-a-console) for running Python commands. Generally, run commands on Heroku by adding `heroku run ` before the rest of the command listed below.

### Production setup for Celery

Once the application is deployed to Heroku, Celery will be ready to run. To enable it, run the command `heroku ps:scale worker=1`. See Heroku's [Celery deployment](https://devcenter.heroku.com/articles/celery-heroku#deploying-on-heroku). To run the worker dyno as well, Heroku needs to be on a non-free plan.

**Note**: if the application changes its task structure and Celery tries to run old tasks, run the `celery purge` command from within the application's virtualenv.

### Production setup for Redis and RabbitMQ

In the resources section of the Heroku application, add the `Heroku Data for Redis` and `CloudAMQP` add-ons. Unless we learn otherwise, the `CloudAMWP` should be able to use the free plan, while `Heroku Data for Redis` should be able to use the cheapest not-free plan.

Redis is used for caching data for the front end, and as the backend for Celery tasks. RabbitMQ is used as the broker for Celery tasks.

## Scraping data

This application runs several tasks to scrape data from all of the data sources in the background. Whenever a scraper task runs, it will clear any cached data related to that task. In other words, the result scraper will clear any cached result queries. This is designed to keep the application from displaying cached data that is older than the newest scraped data.

### On a Schedule

While the scraper's tasks can be run manually, they are designed primarily to run automatically at intervals, which are configurable within the application's settings.

The default scrape behavior is to run these scraper tasks based on the `DEFAULT_SCRAPE_FREQUENCY` configuration value (which is stored in seconds and defaults to `86400` seconds, or one day):

- `areas`: the areas for which elections happen. Counties, wards, precincts, school board districts, etc.
- `elections`: the distinct elections periods. For example, the 2022 primary election.
- `contests`: the distinct electoral contests. For example, the 2022 governor's race.
- `questions`: ballot questions.
- `results`: the results of an election that has occurred.

The default behavior is primarily designed to structure the data before an election occurs, although it may also catch changes when results are finalized.

There are multiple ways that the application can run the `results` task much more frequently. This is designed to detect the status of contests as results come in, for example on election night, whether all the results are in or not.

#### Set the start and end window as configuration values

To set an election return window by configuration values, use the `ELECTION_DAY_RESULT_HOURS_START` and `ELECTION_DAY_RESULT_HOURS_END` settings. Both of these values should be stored in a full datetime string such as `"2022-08-23T00:00:00-0600"`.

If the application detects that the current time is between these start and end values, it will run the `results` task based on the `ELECTION_DAY_RESULT_SCRAPE_FREQUENCY` configuration value, which is stored in seconds. See the `.env-example` and `config.py` files for how this value is set.

#### Use the election date from the scraper sources

If the `ELECTION_DAY_RESULT_HOURS_START` and `ELECTION_DAY_RESULT_HOURS_END` settings are not filled out, the plugin will look to the election data in the `scraper_sources.json` file. Each entry should have a `date` value, and the plugin will assume that date is the election date. From there, the application will use the `ELECTION_DAY_RESULT_DEFAULT_START_TIME` (this is midnight by default) and `ELECTION_DAY_RESULT_DEFAULT_DURATION_HOURS` (this defaults to 48 hours) values to determine a start and end value for election day behavior.

If the application detects that the current time is between these start and end values (for example, between 8pm on election day and 8pm the following day), it will run the `results` task based on the `ELECTION_DAY_RESULT_SCRAPE_FREQUENCY` configuration value, which is stored in seconds. It defaults to run every `180` seconds, which is three minutes.

#### Use the override configuration value

This window detection behavior can be overridden by setting the `ELECTION_RESULT_DATETIME_OVERRIDDEN` configuration value. If it is set to `"true"`, the `results` task will run according to the `ELECTION_DAY_RESULT_SCRAPE_FREQUENCY` value, regardless of what day it is. If it is set to `"false"`, the `results` task will run according to the `DEFAULT_SCRAPE_FREQUENCY` value, regardless of what day it is. Don't use either value in `ELECTION_RESULT_DATETIME_OVERRIDDEN` unless the current behavior specifically needs to be overridden; remove the setting after the override is no longer necessary.

### In a Browser

To run the scraper in a browser, use the following URLs:

- Scrape areas: [areas](https://minnpost-mn-election-results.herokuapp.com/scraper/areas/)
  * This is something that only really needs to be done once, at least close to the election, as there little change it will change the day of the election.
- Scrape contests: [contests](https://minnpost-mn-election-results.herokuapp.com/scraper/contests/)
  * This one also will match the contests to the boundary service.
- Scrape elections: [elections](https://minnpost-mn-election-results.herokuapp.com/scraper/elections/)
- Scrape questions: [questions](https://minnpost-mn-election-results.herokuapp.com/scraper/questions/)
- Scrape results: [results](https://minnpost-mn-election-results.herokuapp.com/scraper/results/)

**Note**: `ELECTION_DATE_OVERRIDE` is an optional override configuration value that can be added to `.env`. The newest election will be used if not provided. If an override is necessary, the value should be the key of the object in the `scraper_sources.json` file; for instance `20140812`.

By receiving parameters, the scraper URLs can limit what is scraped by the various endpoints. Each endpoint, unless otherwise noted, can receive data in `GET`, `POST`, and JSON formats. Unless otherwise noted, all scraper endpoints receive an optional `election_id` parameter. For example, [https://minnpost-mn-election-results.herokuapp.com/scraper/areas/?election_id=id-20211102].

### Command line

** this part is not done **

Ideally, it would be good to make command line equivalents of the scraper URLs. Previously these commands were called:

1. `python code/scraper.py scrape areas <ELECTION_DATE>`
1. `python code/scraper.py scrape questions <ELECTION_DATE>`
1. `python code/scraper.py scrape match_contests <ELECTION_DATE>`
1. `python code/scraper.py scrape results <ELECTION_DATE>`

## Accessing the API

The application's API returns the most recent data, in JSON format, that has been stored by the scraper tasks. Once an API endpoint has been requested, data is cached based on the API settings, and it is returned by the application until either the relevant scraper task runs again, or until the cache expires. The cache's default expiration is stored in seconds in the `CACHE_DEFAULT_TIMEOUT` configuration value. There is a separate value for the Google Sheet API's timeout, which is stored (also in seconds) in the `PARSER_API_CACHE_TIMEOUT` configuration value.

To access the scraper's data, use the following URLs. These URLs will return all of the contents of the respective models:

- [areas](https://minnpost-mn-election-results.herokuapp.com/api/areas)
- [contests](https://minnpost-mn-election-results.herokuapp.com/api/contests)
- [contest boundaries](https://minnpost-mn-election-results.herokuapp.com/api/boundaries)
- [elections](https://minnpost-mn-election-results.herokuapp.com/api/elections)
- [questions](https://minnpost-mn-election-results.herokuapp.com/api/questions)
- [results](https://minnpost-mn-election-results.herokuapp.com/api/results)
- [sql queries](`https://minnpost-mn-election-results.herokuapp.com/api/query/`)

By receiving parameters, the API can limit what is returned by the various endpoints. Each endpoint, unless otherwise noted, can receive data in `GET`, `POST`, and JSON formats.

### For all endpoints

Unless otherwise noted, all API endpoints can receive parameters with a "true" or "false" value to control cache behavior: `bypass_cache`, `delete_cache`, and `cache_data`.

#### Default values

- `bypass_cache` whether to load data from the cache. Defaults to "false".
- `delete_cache` whether to delete existing cached data for this request. Defaults to "false".
- `cache_data` whether to cache this request's response. Defaults to "true".

### SQL query

This endpoint returns the result of a valid `select` SQL query. For example, to run the query `select * from meta`, use the URL [https://minnpost-mn-election-results.herokuapp.com/api/query/?q=select%20*%20from%20meta]. This endpoint currently runs the legacy election dashboard on MinnPost, although ideally we will be able to replace it with proper calls to the SQL-Alchemy models.

This endpoint also accepts a `callback` parameter. If it is present, it returns the data as JavaScript instead of JSON, for use as `JSONP`. This is needed for the legacy election dashboard on MinnPost.

### Areas

The Areas endpoint can receive `area_id`, `area_group`, and `election_id` parameters.

- Area ID: [https://minnpost-mn-election-results.herokuapp.com/api/areas/?area_id=precincts-69-0770]
- Area Group: [https://minnpost-mn-election-results.herokuapp.com/api/areas/?area_group=municipalities]
- Election ID: [https://minnpost-mn-election-results.herokuapp.com/api/areas/?election_id=id-20211102]

### Contests and Contest Boundaries

The Contests and Contest Boundaries endpoints can both receive `title`, `contest_id`, `contest_ids` (for multiple contests), and `election_id` parameters.

- Contest ID: [https://minnpost-mn-election-results.herokuapp.com/api/contests/?contest_id=id-MN---02872-1001]
- Contest Title: [https://minnpost-mn-election-results.herokuapp.com/api/contests/?title=governor]
- Contest IDs: [https://minnpost-mn-election-results.herokuapp.com/api/contests/?contest_ids=id-MN---43000-2001,id-MN---43000-1131,id-MN---43000-1132,id-MN---43000-1133,id-MN---58000-1131,id-MN---43000-2121,id-MN---43000-2181,id-MN---43000-2191]
- Election ID: [https://minnpost-mn-election-results.herokuapp.com/api/contests/?election_id=id-20211102]

### Elections

The Elections endpoint can receive `election_id` and `election_date` parameters.

- Election ID: [https://minnpost-mn-election-results.herokuapp.com/api/elections/?election_id=id-MN---02872-1001]
- Election Date: [https://minnpost-mn-election-results.herokuapp.com/api/elections/?election_date=2021-11-02]

### Questions

The Questions endpoint can receive a `question_id`, `contest_id`, and `election_id` parameters.

- Question ID: [https://minnpost-mn-election-results.herokuapp.com/api/questions/?question_id=id-82-1131-13456-]
- Contest ID: [https://minnpost-mn-election-results.herokuapp.com/api/questions/?contest_id=id-MN---13456-1131]
- Election ID: [https://minnpost-mn-election-results.herokuapp.com/api/questions/?election_id=id-20211102]

### Results

The Results endpoint can receive `result_id`, `contest_id`, and `election_id` parameters.

- Result ID: [https://minnpost-mn-election-results.herokuapp.com/api/results/?result_id=id-MN---02872-1001-9901]
- Contest ID: [https://minnpost-mn-election-results.herokuapp.com/api/results/?contest_id=id-MN---02872-1001]
- Election ID: [https://minnpost-mn-election-results.herokuapp.com/api/results/?election_id=id-20211102]
