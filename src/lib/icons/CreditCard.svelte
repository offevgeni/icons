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
	{@html "<path id=\"CreditCard-__card\" d=\"M22.13,9.9h-.01c-.07-2.69-2.26-4.85-4.97-4.85H6.86c-2.71,0-4.9,2.16-4.97,4.85h-.01v2.1h0v2.06c0,2.75,2.23,4.99,4.99,4.99h10.28c2.75,0,4.99-2.23,4.99-4.99v-2.06h0v-2.1ZM6.86,7.14h10.28c1.55,0,2.8,1.22,2.87,2.75H3.99c.07-1.53,1.33-2.75,2.87-2.75ZM20.03,14.06c0,1.59-1.3,2.89-2.89,2.89H6.86c-1.59,0-2.89-1.3-2.89-2.89v-2.06h16.05v2.06Z\"/>"}
</svg>
