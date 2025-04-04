export const TitleDescription = ({ title, description, button }) => {
  return (
    <div className="flex items-center justify-between mb-4 w-full">
      <div className="space-y-1 mr-4">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {button && button}
    </div>
  );
};
