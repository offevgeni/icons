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
  class="icon icon-home{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <g><path fill-rule="evenodd" d="M14.469 2.163a3.75 3.75 0 0 0-4.938 0L2.873 7.988a4.75 4.75 0 0 0-1.623 3.575V20A3.75 3.75 0 0 0 5 23.75h14A3.75 3.75 0 0 0 22.75 20v-8.437a4.75 4.75 0 0 0-1.623-3.575zM8.162 14.825a.75.75 0 0 0-1.355.644 5.75 5.75 0 0 0 10.388-.004.75.75 0 1 0-1.355-.643 4.25 4.25 0 0 1-7.678.003" clip-rule="evenodd"/></g>
</svg>
