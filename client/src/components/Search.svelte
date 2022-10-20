<style>
    .search-field {
        width: 100%;
        max-width: 100%;
    }
    form {
        border-bottom: 1px solid #5e6e76;
        padding: 0 1.5em;
        margin: 0 auto 1.5em auto;
        width: 83.6842105263%;
    }
    fieldset {
        border: 0;
    }
    @media screen and (min-width: 30em) {
        form {
            width: 75.5172413793%;
        }
    }
    @media screen and (min-width: 50em) {
        form {
            width: 58.7179487179%;
        }
    }
    @media screen and (min-width: 60em) {
        form {
            width: 59.1525423729%;
        }
    }
    @media screen and (min-width: 70em) {
        form {
            width: 59.3670886076%;
        }
    }
</style>

<script>
    // svelte-pathfinder stuff
	//import { path, pattern, submit } from 'svelte-pathfinder';
    import {push, link, location, querystring} from 'svelte-spa-router';

    // form behavior
    let searchTerm = "";
    let searchField;
    if ( ! $location.startsWith("/search/") || searchParams.get('q') === null) {
        searchField.value = "";
    }
    function searchClick(path) {
        if ( path !== '') {
            push('/search/?q=' + path);
        } else {
            push('/');
        }
        searchTerm = path;
    }
</script>

<div class="m-form m-form-search">
    
        <form on:submit|preventDefault={() => searchClick(searchTerm)} action="" method="GET">
            <fieldset>
                <label class="a-search-label screen-reader-text" for="q">Search for a contest</label>
                <div class="a-input-with-button a-button-sentence">
                    <input type="search" name="q"
                        bind:value={searchField}
                        class="search-field"
                        placeholder="Search for a contest"
                    >
                    <input type="submit" class="search-submit" value="Search">
                </div>
            </fieldset>
        </form>
        <ol>
        {#if ($location !== "/")}
            <li><a href="/" use:link>return to dashboard</a></li>
        {/if}
        </ol>
        <!--<ol>
            <li>suggested searches</li>
            <li><a href="/" on:click={e => suggestedSearchClick()}>return to dashboard</a></li>
        </ol>-->
    
</div>
