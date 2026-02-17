<script>
  let { 
    size = 24, 
    color = 'currentColor',
    class: className = '',
    ...props 
  } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 32 32"
  fill={color}
  class="icon icon-bar-chart-3 {className}"
  {...props}
>
  <path d="M29,10c0,-0.552 -0.448,-1 -1,-1l-4,0c-0.552,0 -1,0.448 -1,1l-0,18c0,0.552 0.448,1 1,1l4,0c0.552,0 1,-0.448 1,-1l-0,-18Zm-20,6c-0,-0.552 -0.448,-1 -1,-1l-4,0c-0.552,0 -1,0.448 -1,1l-0,12c0,0.552 0.448,1 1,1l4,0c0.552,0 1,-0.448 1,-1l-0,-12Zm10,-12c0,-0.552 -0.448,-1 -1,-1l-4,0c-0.552,0 -1,0.448 -1,1l-0,24c0,0.552 0.448,1 1,1l4,0c0.552,0 1,-0.448 1,-1l-0,-24Z"/><g id="Icon"/>
</svg>
