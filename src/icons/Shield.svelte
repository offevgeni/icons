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
  class="icon icon-shield{className ? ' ' + className : ''}"
  aria-hidden={!title}
  {...rest}
  role={title ? 'img' : 'presentation'}
>
  {#if title}<title>{title}</title>{/if}
  <path fill={color} fill-rule="evenodd" d="M12.824 2.196a3 3 0 0 0-1.648 0l-5 1.428A3 3 0 0 0 4 6.51v5.374a9 9 0 0 0 3.769 7.324l2.487 1.776a3 3 0 0 0 3.488 0l2.487-1.776A9 9 0 0 0 20 11.883V6.51a3 3 0 0 0-2.176-2.885z" clip-rule="evenodd"/>
</svg>
