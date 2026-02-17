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
  class="icon icon-heart{className ? ' ' + className : ''}"
  aria-hidden={!title}
  {...rest}
  role={title ? 'img' : 'presentation'}
>
  {#if title}<title>{title}</title>{/if}
  <path fill={color} d="M7 2C3.313 2 1 5.215 1 8.5c0 3.341 1.674 6.2 3.772 8.43 2.1 2.233 4.705 3.927 6.78 4.964a1 1 0 0 0 .895 0c2.076-1.037 4.68-2.73 6.782-4.964C21.326 14.7 23 11.84 23 8.5 23 5.22 20.729 2 17 2c-1.725 0-2.947.48-3.881 1.21a7 7 0 0 0-1.122 1.126 7 7 0 0 0-1.132-1.128C9.929 2.48 8.709 2 7 2"/>
</svg>
