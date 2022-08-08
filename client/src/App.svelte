<script>
	import { click, prefs, path, query, fragment, submit, state, pattern } from 'svelte-pathfinder';
	//import { contestStore } from './stores.js';
	import Results from "./Results.svelte";

	prefs.hashbang = true;


</script>

<svelte:window on:click={click} />

<div class="election-results">
	<header class="m-dashboard-header">
		<h2 class="a-election-status">election date primary or general election results. Last updated on when it was updated</h2>
	</header>

	<div>
		<ol>
			<li>search form</li>
			<li>suggested searches</li>
			<li><a href="/" on:click={e => $path = '/'}>return to dashboard</a></li>
		</ol>
	</div>

	<nav>
		<ul>
			
			<li><a href="/search" on:click={e => $path = '/search/'}>Search</a></li>
		</ul>
	</nav>

	{#if $pattern('/contests/:id')} <!-- eg. /products/1 -->
		contest id {$path.params.id}
	{:else}
		<Results/>
	{/if}

	<ol>
		<li>show results
			<ul>
				<li>list of current result races</li>
			</ul>
			<ul>
				<li>table of individual race's results</li>
				<li>map</li>
				<li>permalink to that race?</li>
			</ul>
		</li>
	</ol>

</div>