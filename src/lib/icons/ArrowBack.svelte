<script>
	export let size = 24;
	export let title = undefined;
</script>

<svg
	{...$$restProps}
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="currentColor"
	role={title ? 'img' : 'presentation'}
	aria-hidden={title ? undefined : 'true'}
>
	{#if title}<title>{title}</title>{/if}
	{@html "<path id=\"ArrowBack-__arrow-back\" d=\"M22.13,10.95H6.1c1.56-1.08,3.49-2.58,5.36-4.54l-1.73-1.24c-3.79,3.85-7.81,5.86-7.86,5.88v1.89s4.07,2.03,7.86,5.88l1.73-1.24c-1.87-1.95-3.8-3.46-5.36-4.54h16.03v-2.1Z\"/>"}
</svg>
