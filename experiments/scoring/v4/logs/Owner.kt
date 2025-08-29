
/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.springframework.samples.petclinic.owner

import org.springframework.core.style.ToStringCreator
import org.springframework.samples.petclinic.model.Person
import org.springframework.util.Assert
import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.OneToMany
import jakarta.persistence.OrderBy
import jakarta.persistence.Table
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.NotBlank

/**
 * Simple JavaBean domain object representing an owner.
 *
 * @author Ken Krebs
 * @author Juergen Hoeller
 * @author Sam Brannen
 * @author Michael Isvy
 * @author Oliver Drotbohm
 * @author Wick Dynex
 */
@Entity
@Table(name = "owners")
class Owner : Person() {

    @field:Column(name = "address")
    @field:NotBlank
    var address: String = ""

    @field:Column(name = "city")
    @field:NotBlank
    var city: String = ""

    @field:Column(name = "telephone")
    @field:NotBlank
    @field:Pattern(regexp = "\\d{10}", message = "{telephone.invalid}")
    var telephone: String = ""

    @field:OneToMany(cascade = [CascadeType.ALL], fetch = FetchType.EAGER)
    @field:JoinColumn(name = "owner_id")
    @field:OrderBy("name")
    val pets: MutableList<Pet> = ArrayList()

    fun getAddress(): String = address

    fun setAddress(address: String) {
        this.address = address
    }

    fun getCity(): String = city

    fun setCity(city: String) {
        this.city = city
    }

    fun getTelephone(): String = telephone

    fun setTelephone(telephone: String) {
        this.telephone = telephone
    }

    fun getPets(): List<Pet> = pets

    fun addPet(pet: Pet) {
        if (pet.isNew) {
            pets.add(pet)
        }
    }

    fun getPet(name: String): Pet? = getPet(name, false)

    fun getPet(id: Int?): Pet? {
        return pets.firstOrNull { !it.isNew() && it.id == id }
    }

    fun getPet(name: String, ignoreNew: Boolean): Pet? {
        return pets.firstOrNull { pet ->
            pet.name?.equals(name, ignoreCase = true) == true &&
            (!ignoreNew || !pet.isNew)
        }
    }

    override fun toString(): String =
        ToStringCreator(this)
            .append("id", id)
            .append("new", isNew)
            .append("lastName", lastName)
            .append("firstName", firstName)
            .append("address", address)
            .append("city", city)
            .append("telephone", telephone)
            .toString()

    fun addVisit(petId: Int?, visit: Visit?) {
        requireNotNull(petId) { "Pet identifier must not be null!" }
        requireNotNull(visit) { "Visit must not be null!" }

        val pet = getPet(petId)
        requireNotNull(pet) { "Invalid Pet identifier!" }

        pet.addVisit(visit)
    }
}
