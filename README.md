# MN Election Results

Scraper for Minnesota elections.

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

## Google Sheets setup

For both local and remote environments, you'll need to make sure the application has access to the Google Sheets data. In version 4 of the Sheets API, this happens through Service Accounts.

### Creating a new authentication

If you are authenticating with the Sheets API for the first time, you'll need to create a new Google Cloud project. Start by following [this guide from Google](https://developers.google.com/workspace/guides/create-project). When you've finished Google's steps, you should have a new project.

Our specific Google Sheets integration uses the [Sheetfu library](https://github.com/socialpoint-labs/sheetfu), which has [an authentication guide](https://github.com/socialpoint-labs/sheetfu/blob/master/documentation/authentication.rst) to finish this process. The screenshots are not necessarily up to date with the names Google uses for things.

Between these resources, you should follow these steps to create and access the authentication credentials:

1. Create a new Google Cloud Platform project.
1. Enable the Sheets and Drive APIs in the APIs & Services section of the Google Cloud Platform settings.
1. Create a Service Account in the IAM & Admin section of the Google Cloud Platform settings.
1. Download the new JSON-formatted key for that Service Account. Only use this key for one environment.

This new Service account will have an automatically-created email address. For this application, that email address must have at least Viewer-level access on any Google Sheets that it needs to access. It's best to give it that level of access on the folder level.

If this user is new or it is being given new access, it can take a few minutes for the changes to propogate.

### Accessing an existing authentication

If the Service Account user already exists in the Google Cloud Platform, you can access it at https://console.cloud.google.com/home/dashboard?project=[application-name]. In MinnPost's case, this URL is [https://console.cloud.google.com/home/dashboard?project=minnpost-mn-election-results](https://console.cloud.google.com/home/dashboard?project=minnpost-mn-election-results).

If it hasn't been, you'll need your Google account added. An Administrator can do that at the correct dashboard URL by clicking "Add People to this Project."

Follow these steps to access the authentication credentials:

1. Once you have access to the project's dashboard, click "Go to project settings" in the Project info box.
1. Click Service Accounts in the IAM & Admin section of the Google Cloud Platform settings.
1. If there is more than one service account, find the correct one.
1. Click the Actions menu for that account and choose the Manage keys option.
1. Click Add Key, choose Create new key, and choose JSON as the Key type. Click the Create button and download the key for that Service Account. Only use this key for one environment.

## Local setup and development

1. Install `git`
1. Get the code: `git clone https://github.com/MinnPost/minnpost-scraper-mn-election-results.git`
1. Change the directory: `cd minnpost-scraper-mn-election-results`
1. Create a `.env` file based on the repository's `.env-example` file in the root of your project.
1. Run `pipenv install`.
1. Open up three command line tabs if you need to run the scheduled scraping tasks as well as the API. In each tab, run `pipenv shell`. See below section on Scraping data.
1. To process scrape tasks, either manually or on schedule, run `celery -A src.worker:celery worker --loglevel=INFO` in a tab.
1. To run the scheduled scraper, run `celery -A src.worker:celery beat --loglevel=INFO` in a tab.
1. In the tab where you want to run the Flask-based API, run `flask run --host=0.0.0.0`. This creates a basic endpoint server at http://0.0.0.0:5000.

### Local setup for Postgres

This documentation describes how to install Postgres with Homebrew.

1. Run `brew install postgresql` to install Postgres.
1. Run `psql postgres` to start the server and log in to it.
1. A free, Mac-based graphic manager for Postgres is [Postbird](https://www.electronjs.org/apps/postbird).
1. Create a database. For this example, call it `election-scraper`.
1. Installing with Homebrew creates a user with no password. The connection string will be `"postgresql://username:@localhost/election-scraper"`. Enter this connection string to the `DATABASE_URL` value of the `.env` file.

To get the data for the database, you can either [export it from Heroku](https://devcenter.heroku.com/articles/heroku-postgres-import-export) or run the SQL commands that are in this repository's `election-scraper-structure.sql` file. Running the commands in this file will result in a database with all of the required tables, but they'll all be empty. This file was created in Postgres version 13.4.

### Local authentication for Google Sheets

Enter the configuration values from the JSON key downloaded above into the `.env` file's values for these fields:

- `SHEETFU_CONFIG_TYPE`
- `SHEETFU_CONFIG_PROJECT_ID`
- `SHEETFU_CONFIG_PRIVATE_KEY_ID`
- `SHEETFU_CONFIG_PRIVATE_KEY`
- `SHEETFU_CONFIG_CLIENT_EMAIL`
- `SHEETFU_CONFIG_CLIENT_ID`
- `SHEETFU_CONFIG_AUTH_URI`
- `SHEETFU_CONFIG_TOKEN_URI`
- `SHEETFU_CONFIG_AUTH_PROVIDER_URL`
- `SHEETFU_CONFIG_CLIENT_CERT_URL`

See the scraper section below for commands to run after local setup is finished.

## Production setup and deployment

### Code, Libraries and prerequisites

This application should be deployed to Heroku. If you are creating a new Heroku application, clone this repository with `git clone https://github.com/MinnPost/minnpost-scraper-mn-election-results.git` and follow [Heroku's instructions](https://devcenter.heroku.com/articles/git#creating-a-heroku-remote) to create a Heroku remote.

### Production setup for Postgres

Add the Heroku Postgres add-on to the Heroku application. The amount of data that this scraper uses will require at least the `Hobby Basic` plan. Heroku allows two applications to share the same database. They provide [instructions](https://devcenter.heroku.com/articles/managing-add-ons#using-the-command-line-interface-attaching-an-add-on-to-another-app) for this.

To get the data into the database, you can either [import it into Heroku](https://devcenter.heroku.com/articles/heroku-postgres-import-export), either from the included `election-scraper-structure.sql` file or from your database once it has data in it.

If you want to create empty tables on Heroku, you can do that by running the `CREATE TABLE` and `CREATE INDEX` commands from the `election-scraper-structure.sql` files after you open a `heroku pg:psql` session. Then you can run the scraper to populate the database.

### Production authentication for Google Sheets

In the project's Heroku settings, enter the configuration values from the production-only JSON key downloaded above into the values for these fields:

- `SHEETFU_CONFIG_TYPE`
- `SHEETFU_CONFIG_PROJECT_ID`
- `SHEETFU_CONFIG_PRIVATE_KEY_ID`
- `SHEETFU_CONFIG_PRIVATE_KEY`
- `SHEETFU_CONFIG_CLIENT_EMAIL`
- `SHEETFU_CONFIG_CLIENT_ID`
- `SHEETFU_CONFIG_AUTH_URI`
- `SHEETFU_CONFIG_TOKEN_URI`
- `SHEETFU_CONFIG_AUTH_PROVIDER_URL`
- `SHEETFU_CONFIG_CLIENT_CERT_URL`

Run the scraper commands from the section below by following [Heroku's instructions](https://devcenter.heroku.com/articles/getting-started-with-python#start-a-console) for running Python commands. Generally, run commands on Heroku by adding `heroku run ` before the rest of the command listed below.

## Scraping data

`<ELECTION_DATE>` is optional and the newest election will be used if not provided. It should be the key of the object in the `scraper_sources.json` file; for instance `20140812`.

1. (optional) Remove old data as the scraper is not built to manage more than one election: `find command to dump database` (let's find out if this is still necessary)
1. Scrape areas: `python code/scraper.py scrape areas <ELECTION_DATE>`
  * This is something that only really needs to be done once, at least close to the election, as there little change it will change the day of the election.
1. Scrape questions: `python code/scraper.py scrape questions <ELECTION_DATE>`
1. Scrape the results: `python code/scraper.py scrape results <ELECTION_DATE>`
  * This is the core processing of the scraper will be run frequently.
1. Match contests to boundary area: `python code/scraper.py match_contests <ELECTION_DATE>`
1. (optional) To check each boundary ID against the boundary service: `python code/scraper.py check_boundaries`

# stuff we have to build, still

## Scheduling

We need to run the scraper commands at intervals that differ based on which command it is and whether we're in the result hour window on Election Day.

Set the result hour window by adding a datetime value to `ELECTION_RESULT_DATETIME_START` and `ELECTION_RESULT_DATETIME_END`. If you're developing locally, add these values to your `.env` file; in production, add it to the Heroku settings for the application. The code will check to make sure these are both actual `datetime`s and that the window between them is a valid timespan; if it is not a valid time window it will act as it does normally.

To manually turn the result hour window on, regardless of the time window, set the `ELECTION_RESULT_DATETIME_OVERRIDDEN` setting to `True`.

### Run daily, except during result hours on Election Day

- `python code/scraper.py scrape areas <ELECTION_DATE>`
- `python code/scraper.py scrape questions <ELECTION_DATE>`
- `python code/scraper.py scrape results <ELECTION_DATE>`
- `python code/scraper.py match_contests <ELECTION_DATE>` 

### Run in an infinite loop during result hours on Election Day

- `python code/scraper.py scrape results <ELECTION_DATE>`

### Don't run, currently

- `python code/scraper.py check_boundaries`

## Web-based API

The API needs to be a scalable, always-available resource we can post `key => value` queries to, and get `JSONP` data back from either the Postgres database or from the Redis cache in return.

## Caching

When any of the scheduled tasks *finish* running, we should invalidate the Redis-based API cache.

When the API receives a request, it should check for a valid Redis response for that request before running a query against the database. If there is a valid response, it should send the cached `JSONP` data.
