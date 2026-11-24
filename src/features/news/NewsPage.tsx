import { NewsHeadlines } from "./NewsHeadlines";
import { TrailerFeed } from "./TrailerFeed";

export function NewsPage() {
  return <div className="page-stack"><NewsHeadlines /><TrailerFeed /></div>;
}
