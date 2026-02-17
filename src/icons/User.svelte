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
  class="icon icon-user{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path d="M21 20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 8 8 0 0 1 1.79-5 2 2 0 0 1 2.67-.39 8.07 8.07 0 0 0 9.07 0 2 2 0 0 1 2.68.39A8 8 0 0 1 21 20m-9-6a6 6 0 1 0-6-6 6 6 0 0 0 6 6"/>
</svg>
