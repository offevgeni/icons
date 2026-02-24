<script>
  let {
    size = 24,
    color = 'currentColor',
    strokeWidth = 1.5,
    title = '',
    class: className = '',
    ...rest
  } = $props();
</script>

<svg
  viewBox="0.91 0.67 22.17 22.17"
  width={size}
  height={size}
  fill="none"
  stroke={color}
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class="icon icon-door-open{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path d="M3 21h11V5.99c0-1.365 0-2.047-.281-2.52a2 2 0 0 0-1.093-.876c-.523-.172-1.189-.024-2.52.271l-2.6.578c-.894.199-1.341.298-1.675.539a2 2 0 0 0-.669.833C5 5.193 5 5.651 5 6.567V21m8.994-16H15.8c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C19 6.52 19 7.08 19 8.2V21h2m-10-9h.01"/>
</svg>
