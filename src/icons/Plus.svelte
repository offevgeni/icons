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
  viewBox="4.8 4.8 14.4 14.4"
  width={size}
  height={size}
  fill={color}
  class="icon icon-plus{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path fill-rule="evenodd" d="M11 17a1 1 0 1 0 2 0v-4h4a1 1 0 1 0 0-2h-4V7a1 1 0 1 0-2 0v4H7a1 1 0 1 0 0 2h4z" clip-rule="evenodd"/>
</svg>
