<script>
	import { path, query, submit } from 'svelte-pathfinder';

    let searchTerm = "";

    function suggestedSearchClick() {
        $path = '/';
        searchTerm = "";
    }
</script>

<div class="m-form m-form-search">
    <form on:submit={submit} action="/search" method="GET">
        <fieldset>
            <label class="a-search-label screen-reader-text" for="q">Search for a contest</label>
            <div class="a-input-with-button a-button-sentence">
                <input type="search" name="q"
                    bind:value={searchTerm}
                    class="search-field"
                    placeholder="Search for a contest (do location if we can, but optional)"
                >
                <input type="submit" class="search-submit" value="Search">
            </div>
        </fieldset>
    </form>
    <ol>
        <li>suggested searches</li>
        <li><a href="/" on:click={e => suggestedSearchClick()}>return to dashboard</a></li>
    </ol>
</div>
