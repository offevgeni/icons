<script>
	export let size = 24;
	export let title = undefined;
</script>

<svg
	{...$$restProps}
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 28 28"
	role={title ? 'img' : 'presentation'}
	aria-hidden={title ? undefined : 'true'}
>
	{#if title}<title>{title}</title>{/if}
	{@html "<path d=\"M0 14h28M14 0v28\" data-name=\"Layer 1\" style=\"fill:none;stroke:#000;stroke-miterlimit:10;stroke-width:2.2px\"/>"}
</svg>
