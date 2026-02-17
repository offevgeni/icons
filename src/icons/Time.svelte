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
  class="icon icon-time{className ? ' ' + className : ''}"
  aria-hidden={!title}
  {...rest}
  role={title ? 'img' : 'presentation'}
>
  {#if title}<title>{title}</title>{/if}
  <path fill={color} fill-rule="evenodd" d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12m9.828-5.243a1 1 0 0 1 1 1v4.968l3.527 1.34a1 1 0 1 1-.71 1.87l-4.172-1.586a1 1 0 0 1-.645-.935V7.757a1 1 0 0 1 1-1" clip-rule="evenodd"/>
</svg>
