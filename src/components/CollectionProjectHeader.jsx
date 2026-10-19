import React from "react";
export default function CollectionProjectHeader({ project }) {
  return (
    <section className="collection-project-header" aria-label="项目头图">
      <img src={project.bannerImage || project.image} alt={project.name} />
    </section>
  );
}
