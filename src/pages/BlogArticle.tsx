import { Navigate } from "react-router-dom";

// Blog articles are not accessible as individual pages for now.
// Redirect any direct /blog/:slug access back to /blog.
const BlogArticle = () => {
  return <Navigate to="/blog" replace />;
};

export default BlogArticle;
