// settings
import {settings} from './../settings.js';

// api calls
export async function fetchContests(key, value, withResults = false) {
	let res = [];
	let endpoint = 'contests';
	if (withResults === true) {
		endpoint = 'contests-with-results';
	}
	if ( key && value ) {
		res = await fetch(`${settings.apiRoot}${endpoint}/?${key}=${value}&election_id=${settings.electionId}`);
	} else {
		res = await fetch(`${settings.apiRoot}${endpoint}/?election_id=${settings.electionId}`);
	}
	const json = await res.json();
	if (res.ok) {
		return json.data;
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
