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
  viewBox="-3.1 -7.6 37.2 37.2"
  width={size}
  height={size}
  fill={color}
  class="icon icon-list{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path fill-rule="evenodd" d="M29 17H10a2 2 0 0 0 0 4h19a2 2 0 0 0 0-4m0-8H10a2 2 0 0 0 0 4h19a2 2 0 0 0 0-4M10 5h19a2 2 0 0 0 0-4H10a2 2 0 0 0 0 4M3 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6m0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6m0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6"/>
</svg>
