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
  class="icon icon-credit-card{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path fill-rule="evenodd" d="M2 8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v.5a.5.5 0 0 1-.5.5h-19a.5.5 0 0 1-.5-.5zm.5 3a.5.5 0 0 0-.5.5V16a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4v-4.5a.5.5 0 0 0-.5-.5zM13 15a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1" clip-rule="evenodd"/>
</svg>
