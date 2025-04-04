import React, { useState } from "react";

const ButtonGroup = ({ buttons, handleClick }) => {
  const [selectedButton, setSelectedButton] = useState(null);

  const handleButtonClick = (value) => {
    setSelectedButton(value);
    handleClick(value);
  };

  return (
    <div className="flex">
      {buttons.map((button, index) => (
        <button
          key={button.value}
          onClick={() => handleButtonClick(button.value)}
          className={`px-4 py-2 ${
            index === 0 ? "border-l" : "" // Left border for the first button
          } border-t border-b border-r  ${
            selectedButton === button.value
              ? "bg-blue-500 text-white"
              : "bg-white"
          }`}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
};

export default ButtonGroup;
``;
