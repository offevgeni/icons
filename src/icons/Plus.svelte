<script>
  let {
    size = 24,
    color = 'currentColor',
    title = '',
    class: className = '',
    ...rest
  } = $props();

  const sizeProps = $derived(typeof size === 'number'
    ? { width: size, height: size }
    : { width: size, height: size });
</script>

<svg
  viewBox="0 0 24 24"
  {...sizeProps}
  fill={color}
  class="icon icon-plus{className ? ' ' + className : ''}"
  aria-hidden={!title}
  {...rest}
  role={title ? 'img' : 'presentation'}
>
  {#if title}<title>{title}</title>{/if}
  <path fill={color} fill-rule="evenodd" d="M11 17a1 1 0 1 0 2 0v-4h4a1 1 0 1 0 0-2h-4V7a1 1 0 1 0-2 0v4H7a1 1 0 1 0 0 2h4z" clip-rule="evenodd"/>
</svg>
