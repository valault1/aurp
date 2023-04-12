import * as React from "react";
import Box from "@mui/material/Box";
import { DataGrid, GridColDef, GridValueGetterParams } from "@mui/x-data-grid";
import { Restaurant } from "api/entityDefinitions";
import { PrimaryButton, SecondaryButton } from "components/Form.elements";
import { Container } from "@mui/material";
import { useGetEntities } from "shared/hooks/useGetEntities";

export const RestaurantList = () => {
  const { data: restaurants } = useGetEntities<Restaurant>({
    entityName: "restaurant",
  });
  const [visible, setVisible] = React.useState(false);
  const columns: GridColDef[] = [
    {
      field: "restaurantName",
      headerName: "Restaurant Name",
      flex: 1,
      minWidth: 249,
      editable: false,
    },
    {
      field: "tags",
      headerName: "Tags",
      flex: 1,
      minWidth: 249,
      editable: false,
    },
  ];

  const handleToggle = () => {
    setVisible((current) => !current);
  };

  const rows = restaurants?.map((restaurant: Restaurant, index: number) => ({
    id: index,
    restaurantName: restaurant.name,
    tags: restaurant.tags,
  }));

  return (
    <Box
      sx={{
        height: 400,
        width: "50%",
        minWidth: "500px",
        textAlign: "center",
      }}
    >
      <SecondaryButton onClick={handleToggle}>
        {" "}
        See Your Restaurant List{" "}
      </SecondaryButton>
      {visible && restaurants && (
        <DataGrid
          rows={rows || []}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 5,
              },
            },
          }}
          pageSizeOptions={[5]}
          // checkboxSelection
          disableRowSelectionOnClick
        />
      )}
    </Box>
  );
};
