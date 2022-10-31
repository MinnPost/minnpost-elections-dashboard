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
    /*:global(div.autocomplete) {
        width: 100%;
    }
    :global(.input-container) {
        width: 100%;
        height: 100%;
        display: flex;
        margin: 0;
    }
    :global(span.autocomplete-clear-button) {
        opacity: 0.6;
    }*/
</style>

<script>
    // routing
    import {push, location, querystring} from 'svelte-spa-router';

    import { fetchContests } from "../data/api.js";

    // form behavior
    let searchTerm = "";
    let searchParams = new URLSearchParams($querystring);
    if ( ! $location.startsWith("/search/") || searchParams.get('address') === null) {
        searchTerm = "";
    }
    let searchSubmit = function(event, value) {
        if ( typeof value === 'object' ) {
            value = value.address;
        }
        if (value === '') {
            const formData = new FormData(event.target);
            let data = [];
            for (let field of formData) {
                const [key, value] = field;
                data[key] = value;
            }
            if (data['address'] ) {
                value = data['address'];
            }
        }
        if ( value !== '') {
            push('/search/?address=' + value);
        }
        searchTerm = value;
    }
    let suggestedSearchClick = function(value) {
        if ( typeof value === 'object' ) {
            value = value.boundary;
        }
        if ( value !== '') {
            push('/search/?address=' + value);
        } else {
            push('/');
            clearInput();
        }
        searchTerm = value;
    }

    /*async function getContests(keyword) {
        var contests = fetchContests('boundary', keyword, false);
        return contests;
    }*/

    function getItem(value) {
        if (!value) {
            searchTerm = value;
            return '';
        }
        return value.title;
    }


    //let selection = '';
    //let autocompleteClearButton;

    /*import { onMount } from 'svelte';
    onMount(() => {
        const autocompleteInput = document.querySelector('input.autocomplete-input');
        autocompleteInput.addEventListener('input', _inputChanged);

        const autocompleteList = document.querySelector('div.autocomplete-list');
        autocompleteList.addEventListener('click', _setAutocomplete);

        autocompleteClearButton = document.querySelector('span.autocomplete-clear-button');
        autocompleteClearButton.addEventListener('click', _clearedAutocomplete);
        _toggleClearButton(false);
    });

    function _inputChanged() {
        // doesn't catch changes made from JS (e.g. clearing)
        // @ts-ignore
        const newValue = this.value;
        _toggleClearButton(!!newValue);
        if (newValue.toLowerCase() != selection?.toLowerCase()) {
        selection = undefined;
        }
    }

    function _clearedAutocomplete() {
        selection = undefined;
        _toggleClearButton(false);
        push('/');
    }

    function _setAutocomplete(event) {
        _toggleClearButton(true);
        if (event.target.textContent) {
            let value = event.target.textContent;
            suggestedSearchClick(value);
        }
    }

    function _toggleClearButton(show) {
        autocompleteClearButton.setAttribute(
        'style',
        'display:' + (show ? 'block' : 'none')
        );
    }
    function clearInput() {
        autocompleteClearButton.click();
    }*/

</script>

<div class="m-form m-form-search m-form-search-contest">
        <form on:submit|preventDefault={() => searchSubmit(event, searchTerm)}>
            <fieldset>
                <label class="a-search-label screen-reader-text" for="q">Search for a contest by address</label>
                <div class="a-input-with-button a-button-sentence">
                    <input type="search" name="address"
                        bind:value={searchTerm}
                        class="search-field"
                        placeholder="Search for a contest by address"
                    >
                    <button type="submit" class="search-submit">Search</button>
                </div>
            </fieldset>
        </form>
</div>