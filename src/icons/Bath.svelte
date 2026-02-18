<script>
  let {
    size = 24,
    color = 'currentColor',
    title = '',
    class: className = '',
    ...rest
  } = $props();
</script>

<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  fill={color}
  class="icon icon-bath{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path d="M21 12H6V6a2 2 0 0 1 2-2h2a2 2 0 0 1 1.855 1.261A3.35 3.35 0 0 0 10 8.3v.656A1.02 1.02 0 0 0 11 10h4a1.02 1.02 0 0 0 1-1.042v-.833a3.1 3.1 0 0 0-2.093-2.966A4 4 0 0 0 10 2H8a4 4 0 0 0-4 4v6H3a1 1 0 0 0 0 2h1v3a2 2 0 0 0 2 2v2a1 1 0 0 0 2 0v-2h8v2a1 1 0 0 0 2 0v-2a2 2 0 0 0 2-2v-3h1a1 1 0 0 0 0-2"/>
</svg>
