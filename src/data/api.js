// settings
import {settings} from './../settings.js';

// api calls
export async function fetchContests(key, value, withResults = false, page = 0, offset = 0) {
	let res = [];
	let endpoint = 'contests';
	if (withResults === true) {
		endpoint = 'contests-with-results';
	}
	// configure the url
	let url = `${settings.apiRoot}${endpoint}/`;
	if ( key && value ) {
		url += `?${key}=${value}`;
	}

	// always add the election id
	url += `&election_id=${settings.electionId}`;

	// if we're paginating, do it
	if (settings.paginate === true) {
		url += `&limit=${settings.limit}&offset=${offset}`;
	}
	res = await fetch(url);
	const json = await res.json();
	if (res.ok) {
		return json;
	} else {
		throw new Error(json);
	}
}

export async function fetchElection() {
	const res = await fetch(`${settings.apiRoot}elections/?election_id=${settings.electionId}`);
	const json = await res.json();
	if (res.ok) {
		return json.data[0];
	} else {
		throw new Error(json);
	}
}
