export let apiRoot = "http://0.0.0.0:5000/api/";

// api calls
export async function fetchContests(key, value) {
	let res = [];
	if ( key && value ) {
		res = await fetch(`${apiRoot}contests/?${key}=${value}`);
	} else {
		res = await fetch(`${apiRoot}contests/`);
	}
	const json = await res.json();
	if (res.ok) {
		return json.data;
	} else {
		throw new Error(json);
	}
}

export async function fetchMetadata() {
	const res = await fetch(`${apiRoot}meta/`);
	const json = await res.json();
	if (res.ok) {
		return json.data;
	} else {
		throw new Error(json);
	}
}
