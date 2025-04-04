import Link from "next/link";

const { Badge } = require("../ui/badge");

const CategoryBadge = ({ category }) => {
  return (
    <Link href={`/category/${category.id}`}>
      <Badge className="mx-2">{category.name}</Badge>
    </Link>
  );
};

export default CategoryBadge;
