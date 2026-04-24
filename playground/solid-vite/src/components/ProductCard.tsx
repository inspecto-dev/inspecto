interface ProductCardProps {
  name: string
}

export function ProductCard(props: ProductCardProps) {
  return (
    <div class="card">
      <h3>{props.name}</h3>
      <p>This is a sample card for testing element inspection.</p>
      <button>Click me</button>
    </div>
  )
}
