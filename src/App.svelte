<script>
	// settings
	import {settings} from './settings.js';

	// behavior
    import { fade } from 'svelte/transition';

	// layout components
	import Head from "./components/Head.svelte";
	import Header from "./components/Header.svelte";
	import Search from './components/Search.svelte';
	import SearchByAddress from './components/SearchByAddress.svelte';
	import Navigation from './components/Navigation.svelte';
	import Results from "./components/Results.svelte";
	import Pagination from "./components/Pagination.svelte";
	import Footer from "./components/Footer.svelte";

	// routing
	import Router from 'svelte-spa-router';
	const routes = {
		// Exact path
		'/': Results,

		// Using named parameters, with last being optional
		'/contests/*': Results,

		// Using named parameters, with last being optional
		'/search/*': Results,

		// Using named parameters, with last being optional
		'/contest/*': Results,

		// Catch-all
		// This is optional, but if present it must be the last
		//'*': NotFound,
	}

	function routeLoaded(event) {
		if (localStorage.getItem("hasCodeRunBefore") === null) {
			/** Your code here. **/
			localStorage.setItem("hasCodeRunBefore", true);
		} else {
			const el = document.querySelector('.m-form-search-contest');
			if (!el) return;
			el.scrollIntoView({
				behavior: 'smooth'
			});
		}
	}

</script>

<style>
	.election-results {
		font-family: "ff-meta-web-pro", helvetica, arial, sans-serif;
	}
	:global(.election-results h2, .election-results .h2, .election-results h3, .election-results .h3, .election-results h4, .election-results .h4, .election-results h5, .election-results .h5) {
		font-family: "ff-meta-web-pro", helvetica, arial, sans-serif;
	}
</style>

<Head/>

<div class="election-results" in:fade="{{duration: 500}}">

	<Search/>

	{#if settings.searchByLocation === true}
		<SearchByAddress/>
	{/if}
	
	<Header/>

	{#if settings.useNavigation === true}
		<Navigation/>
	{/if}

	<Router {routes} on:routeLoaded={routeLoaded} />

	{#if settings.paginate === true}
		<Pagination/>
	{/if}

	<Footer/>

</div>