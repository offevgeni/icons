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
	{@html "<path id=\"User-__user\" d=\"M14.67,13.05c1.94-.98,3.28-2.99,3.28-5.31,0-3.28-2.67-5.96-5.96-5.96s-5.96,2.67-5.96,5.96c0,2.32,1.34,4.34,3.29,5.32l-7.46,2.53v6.74h2.1v-5.23l8.03-2.72,8.03,2.71v5.25s2.1,0,2.1,0v-6.75s-7.45-2.51-7.45-2.51ZM8.14,7.73c0-2.13,1.73-3.86,3.86-3.86s3.86,1.73,3.86,3.86-1.73,3.86-3.86,3.86-3.86-1.73-3.86-3.86Z\"/>"}
</svg>
