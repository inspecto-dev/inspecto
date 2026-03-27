interface ProductCardProps {
  name: string
}

export function ProductCard({ name }: ProductCardProps) {
  return (
    <div className="card">
      <h3>{name}</h3>
      <p>This is a sample card for testing element inspection.</p>
      <button>Click me</button>
    </div>
  )
}
