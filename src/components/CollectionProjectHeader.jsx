import React from "react";
export default function CollectionProjectHeader({ project }) {
  return (
    <section className="collection-project-header" aria-label={project.type === "enrollment" ? "院校照片" : "项目头图"}>
      <img src={project.bannerImage || project.image} alt={project.name} />
    </section>
  );
}
