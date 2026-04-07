<script>
	export let size = 24;
	export let title = undefined;
</script>

<svg
	{...$$restProps}
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 28.2 29.17"
	role={title ? 'img' : 'presentation'}
	aria-hidden={title ? undefined : 'true'}
>
	{#if title}<title>{title}</title>{/if}
	{@html "<g data-name=\"Layer 1\"><circle cx=\"14.1\" cy=\"8.17\" r=\"7.07\" style=\"fill:none;stroke:#000;stroke-miterlimit:10;stroke-width:2.2px\"/><path d=\"M1.1 29.17v-8.62l13-4.43 13 4.43v8.62\" style=\"fill:none;stroke:#000;stroke-miterlimit:10;stroke-width:2.2px\"/></g>"}
</svg>
