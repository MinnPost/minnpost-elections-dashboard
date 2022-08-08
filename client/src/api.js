export let apiRoot = "http://0.0.0.0:5000/api/";

// api calls
export async function fetchContests(key, value) {
	const res = await fetch(`${apiRoot}contests/?${key}=${value}`);
	const json = await res.json();
	if (res.ok) {
		return json;
	} else {
		throw new Error(json);
	}
}

export async function fetchMetadata() {
	const res = await fetch(`${apiRoot}meta/`);
	const json = await res.json();
	if (res.ok) {
		return json;
	} else {
		throw new Error(json);
	}
}
