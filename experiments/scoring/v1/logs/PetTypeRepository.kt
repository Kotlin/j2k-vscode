package org.springframework.samples.petclinic.owner

import java.util.List
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface PetTypeRepository : JpaRepository<PetType, Int> {

    @Query("SELECT ptype FROM PetType ptype ORDER BY ptype.name")
    fun findPetTypes(): List<PetType>

}